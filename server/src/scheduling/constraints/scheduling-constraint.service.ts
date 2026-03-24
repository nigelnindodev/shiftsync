import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClockService } from '../../common/clock/clock.service';
import {
  StaffSkillRepository,
  LocationCertificationRepository,
  StaffAvailabilityRepository,
} from '../../staffing/repositories';
import {
  AssignmentRepository,
  ShiftRepository,
  ShiftSkillRepository,
} from '../repositories';
import { Employee } from '../../users/entity/employee.entity';

import {
  ConstraintCode,
  ConstraintCheckResult,
  ConstraintResult,
  CreateAssignmentContext,
} from '../types';

@Injectable()
export class SchedulingConstraintService {
  private readonly logger = new Logger(SchedulingConstraintService.name);

  constructor(
    private readonly clockService: ClockService,
    private readonly staffSkillRepo: StaffSkillRepository,
    private readonly locationCertRepo: LocationCertificationRepository,
    private readonly availabilityRepo: StaffAvailabilityRepository,
    private readonly assignmentRepo: AssignmentRepository,
    private readonly shiftRepo: ShiftRepository,
    private readonly shiftSkillRepo: ShiftSkillRepository,
    private readonly dataSource: DataSource,
  ) {}

  async validate(
    ctx: CreateAssignmentContext,
    staffMember: Employee,
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<ConstraintResult> {
    const checks = await Promise.all([
      this.checkSkillMatch(ctx),
      this.checkLocationCertification(ctx),
      this.checkAvailability(ctx, staffMember, shiftStartTime, shiftEndTime),
      this.checkNoOverlap(ctx, shiftStartTime, shiftEndTime),
      this.checkRestGap(ctx, shiftStartTime),
      this.checkDailyHours(ctx, shiftStartTime, shiftEndTime),
      this.checkWeeklyHours(ctx, shiftStartTime, shiftEndTime),
      this.checkConsecutiveDays(ctx, shiftStartTime, shiftEndTime),
    ]);

    const violations = checks.filter(
      (c) => c.type === 'VIOLATION' && c.code !== 'OK',
    );
    const warnings = checks.filter(
      (c) => c.type === 'WARNING' && c.code !== 'OK',
    );

    return {
      valid: violations.length === 0,
      violations,
      warnings,
      suggestions: [],
    };
  }

  private async checkSkillMatch(
    ctx: CreateAssignmentContext,
  ): Promise<ConstraintCheckResult> {
    const shiftSkill = await this.shiftSkillRepo.findById(ctx.shiftSkillId);
    if (!shiftSkill) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.SKILL_MISMATCH,
        message: 'Shift skill slot not found',
        details: { shiftSkillId: ctx.shiftSkillId },
      };
    }
    const hasSkill = await this.staffSkillRepo.hasSkill(
      ctx.staffMemberId,
      shiftSkill.skillId,
    );
    if (!hasSkill) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.SKILL_MISMATCH,
        message: 'Staff member does not have the required skill for this shift',
        details: {
          shiftSkillId: ctx.shiftSkillId,
          skillId: shiftSkill.skillId,
        },
      };
    }
    return { type: 'VIOLATION', code: ConstraintCode.OK, message: '' };
  }

  private async checkLocationCertification(
    ctx: CreateAssignmentContext,
  ): Promise<ConstraintCheckResult> {
    const shift = await this.shiftRepo.findById(ctx.shiftId);
    if (shift.isNothing) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.SHIFT_NOT_FOUND,
        message: 'Shift not found',
      };
    }
    const isCertified = await this.locationCertRepo.isCertified(
      ctx.staffMemberId,
      shift.value.locationId,
    );
    if (!isCertified) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.NOT_CERTIFIED,
        message: 'Staff member is not certified to work at this location',
        details: { locationId: shift.value.locationId },
      };
    }
    return { type: 'VIOLATION', code: ConstraintCode.OK, message: '' };
  }

  private async checkAvailability(
    ctx: CreateAssignmentContext,
    staffMember: Employee,
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<ConstraintCheckResult> {
    const shiftDate = new Intl.DateTimeFormat('fr-CA', {
      timeZone: staffMember.homeTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(shiftStartTime); // YYYY-MM-DD in local time

    const exceptions = await this.availabilityRepo.findExceptionsForDate(
      ctx.staffMemberId,
      shiftDate,
    );

    const hasBlockingException = exceptions.some((e) => !e.isAvailable);
    if (hasBlockingException) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.UNAVAILABLE,
        message: 'Staff member has marked this date as unavailable',
      };
    }

    const overrideWindows = exceptions.filter(
      (e) =>
        e.isAvailable &&
        ((e.wallStartTime && e.wallEndTime) ||
          (!e.wallStartTime && !e.wallEndTime)),
    );
    if (overrideWindows.length > 0) {
      const shiftStartWall = this.toWallTime(
        shiftStartTime,
        staffMember.homeTimezone,
      );
      const shiftEndWall = this.toWallTime(
        shiftEndTime,
        staffMember.homeTimezone,
      );
      const startMins = this.wallToMinutes(shiftStartWall);
      let endMins = this.wallToMinutes(shiftEndWall);
      if (endMins <= startMins) endMins += 24 * 60;

      const covered = overrideWindows.some((w) => {
        if (!w.wallStartTime && !w.wallEndTime) return true; // Full day override
        const wStart = this.wallToMinutes(w.wallStartTime!);
        let wEnd = this.wallToMinutes(w.wallEndTime!);
        if (wEnd <= wStart) wEnd += 24 * 60;
        return wStart <= startMins && wEnd >= endMins;
      });
      if (!covered) {
        return {
          type: 'VIOLATION',
          code: ConstraintCode.AVAILABILITY_WINDOW_MISMATCH,
          message:
            "Shift does not fall within staff member's available window for this date",
        };
      }
      return { type: 'VIOLATION', code: ConstraintCode.OK, message: '' };
    }

    const recurring = await this.availabilityRepo.findByStaffMember(
      ctx.staffMemberId,
    );
    const dayOfWeek = this.getDayOfWeekLocalized(
      shiftStartTime,
      staffMember.homeTimezone,
    );
    const dayAvailability = recurring.filter(
      (a) => (a.dayOfWeek as string) === dayOfWeek,
    );

    const shiftStartWall = this.toWallTime(
      shiftStartTime,
      staffMember.homeTimezone,
    );
    const shiftEndWall = this.toWallTime(
      shiftEndTime,
      staffMember.homeTimezone,
    );
    const startMins = this.wallToMinutes(shiftStartWall);
    let endMins = this.wallToMinutes(shiftEndWall);
    if (endMins <= startMins) endMins += 24 * 60;

    const fullyCovered = dayAvailability.some((a) => {
      const aStart = this.wallToMinutes(a.wallStartTime);
      let aEnd = this.wallToMinutes(a.wallEndTime);
      if (aEnd <= aStart) aEnd += 24 * 60;
      return aStart <= startMins && aEnd >= endMins;
    });
    if (!fullyCovered) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.AVAILABILITY_WINDOW_MISMATCH,
        message: 'Staff member is not available during this shift window',
      };
    }
    return { type: 'VIOLATION', code: ConstraintCode.OK, message: '' };
  }

  private async checkNoOverlap(
    ctx: CreateAssignmentContext,
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<ConstraintCheckResult> {
    const overlapping = await this.assignmentRepo.findOverlappingAssignments(
      ctx.staffMemberId,
      shiftStartTime,
      shiftEndTime,
    );
    if (overlapping.length > 0) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.OVERLAP,
        message: 'Staff member has an overlapping assignment at this time',
        details: { overlappingAssignmentIds: overlapping.map((a) => a.id) },
      };
    }
    return { type: 'VIOLATION', code: ConstraintCode.OK, message: '' };
  }

  private async checkRestGap(
    ctx: CreateAssignmentContext,
    shiftStartTime: Date,
  ): Promise<ConstraintCheckResult> {
    const twoWeeksAgo = new Date(
      shiftStartTime.getTime() - 14 * 24 * 60 * 60 * 1000,
    );

    const rawResult: unknown = await this.dataSource.query(
      `
      SELECT assignments.id, shifts.end_time AS "priorShiftEnd"
      FROM assignments
      JOIN shift_skills ss ON ss.id = assignments.shift_skill_id
      JOIN shifts ON shifts.id = ss.shift_id
      WHERE assignments.staff_member_id = $1
        AND assignments.state IN ('ASSIGNED', 'SWAP_REQUESTED', 'SWAP_PENDING_APPROVAL', 'DROP_PENDING_APPROVAL')
        AND shifts.end_time <= $2
        AND shifts.end_time >= $3
      ORDER BY shifts.end_time DESC
      LIMIT 1
      `,
      [ctx.staffMemberId, shiftStartTime, twoWeeksAgo],
    );
    const result = rawResult as Array<{ priorShiftEnd: Date }>;

    if (result.length > 0) {
      const priorEnd = new Date(result[0].priorShiftEnd);
      const gapHours =
        (shiftStartTime.getTime() - priorEnd.getTime()) / (1000 * 60 * 60);
      if (gapHours < 10) {
        return {
          type: 'VIOLATION',
          code: ConstraintCode.REST_GAP,
          message: `Minimum 10-hour rest gap required. Current gap: ${gapHours.toFixed(1)} hours`,
          details: { gapHours },
        };
      }
    }
    return { type: 'VIOLATION', code: ConstraintCode.OK, message: '' };
  }

  private async checkDailyHours(
    ctx: CreateAssignmentContext,
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<ConstraintCheckResult> {
    const shiftDate = shiftStartTime.toISOString().split('T')[0];
    const dayStart = new Date(`${shiftDate}T00:00:00Z`);
    const dayEnd = new Date(`${shiftDate}T23:59:59.999Z`);

    const existingAssignments =
      await this.assignmentRepo.findByStaffMemberAndDateRange(
        ctx.staffMemberId,
        dayStart,
        dayEnd,
      );

    const totalMs = await this.getTotalHoursMs(
      existingAssignments,
      shiftStartTime,
      shiftEndTime,
    );
    const totalHours = totalMs / (1000 * 60 * 60);

    if (totalHours > 12) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.DAILY_HOURS_EXCEEDED,
        message: `Daily hours (${totalHours.toFixed(1)}) exceed 12-hour maximum`,
        details: { totalHours },
      };
    }
    if (totalHours > 8) {
      return {
        type: 'WARNING',
        code: ConstraintCode.DAILY_HOURS_HIGH,
        message: `Daily hours (${totalHours.toFixed(1)}) exceed 8-hour threshold`,
        details: { totalHours },
      };
    }
    return { type: 'WARNING', code: ConstraintCode.OK, message: '' };
  }

  private async checkWeeklyHours(
    ctx: CreateAssignmentContext,
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<ConstraintCheckResult> {
    const weekEnd = shiftEndTime;
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const existingAssignments =
      await this.assignmentRepo.findByStaffMemberAndDateRange(
        ctx.staffMemberId,
        weekStart,
        weekEnd,
      );

    const totalMs = await this.getTotalHoursMs(
      existingAssignments,
      shiftStartTime,
      shiftEndTime,
    );
    const totalHours = totalMs / (1000 * 60 * 60);

    if (totalHours > 40) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.WEEKLY_HOURS_EXCEEDED,
        message: `Weekly hours (${totalHours.toFixed(1)}) exceed 40-hour maximum`,
        details: { totalHours },
      };
    }
    if (totalHours >= 35) {
      return {
        type: 'WARNING',
        code: ConstraintCode.WEEKLY_HOURS_APPROACHING,
        message: `Weekly hours (${totalHours.toFixed(1)}) approaching 40-hour limit`,
        details: { totalHours },
      };
    }
    return { type: 'WARNING', code: ConstraintCode.OK, message: '' };
  }

  private async checkConsecutiveDays(
    ctx: CreateAssignmentContext,
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<ConstraintCheckResult> {
    const weekEnd = shiftEndTime;
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const assignments = await this.assignmentRepo.findByStaffMemberAndDateRange(
      ctx.staffMemberId,
      weekStart,
      weekEnd,
    );

    const workedDates = new Set<string>();
    for (const assignment of assignments) {
      const skillWithShift = await this.shiftSkillRepo.findByIdWithShift(
        assignment.shiftSkillId,
      );
      if (skillWithShift?.shift) {
        workedDates.add(
          skillWithShift.shift.startTime.toISOString().split('T')[0],
        );
      }
    }
    workedDates.add(shiftStartTime.toISOString().split('T')[0]);

    const sortedDates = Array.from(workedDates).sort();
    let maxConsecutive = 1;
    let current = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays =
        (new Date(sortedDates[i]).getTime() -
          new Date(sortedDates[i - 1]).getTime()) /
        (24 * 60 * 60 * 1000);
      if (diffDays === 1) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 1;
      }
    }

    if (maxConsecutive >= 7) {
      return {
        type: 'VIOLATION',
        code: ConstraintCode.CONSECUTIVE_DAYS_7,
        message:
          'Assignment would result in 7th consecutive day worked — requires manager override',
        details: { consecutiveDays: maxConsecutive },
      };
    }
    if (maxConsecutive >= 6) {
      return {
        type: 'WARNING',
        code: ConstraintCode.CONSECUTIVE_DAYS_6,
        message: `Staff member has worked ${maxConsecutive} consecutive days`,
        details: { consecutiveDays: maxConsecutive },
      };
    }
    return { type: 'WARNING', code: ConstraintCode.OK, message: '' };
  }

  private async getTotalHoursMs(
    assignments: import('../entities/assignment.entity').Assignment[],
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<number> {
    let totalMs = shiftEndTime.getTime() - shiftStartTime.getTime();
    for (const assignment of assignments) {
      const skillWithShift = await this.shiftSkillRepo.findByIdWithShift(
        assignment.shiftSkillId,
      );
      if (skillWithShift?.shift) {
        totalMs +=
          skillWithShift.shift.endTime.getTime() -
          skillWithShift.shift.startTime.getTime();
      }
    }
    return totalMs;
  }

  private toWallTime(utcDate: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).formatToParts(utcDate);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${hour}:${minute}`;
  }

  private getDayOfWeek(date: Date): string {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
    return days[new Date(date).getDay()];
  }

  private getDayOfWeekLocalized(utcDate: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: timezone,
    }).formatToParts(utcDate);
    const weekday =
      parts.find((p) => p.type === 'weekday')?.value.toUpperCase() ?? 'SUN';
    return weekday;
  }

  private wallToMinutes(wallTime: string): number {
    const [h, m] = wallTime.split(':').map(Number);
    return h * 60 + m;
  }
}
