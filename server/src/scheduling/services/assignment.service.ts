import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentRepository,
  DomainEventRepository,
  ShiftRepository,
  ShiftSkillRepository,
} from '../repositories';
import { EmployeeRepository } from '../../users/employee.repository';
import { SchedulingConstraintService } from '../constraints/scheduling-constraint.service';
import {
  SchedulingEventPatterns,
  AssignmentCreatedEvent,
  AssignmentRemovedEvent,
} from '../events/scheduling-events';
import { AssignmentState } from '../entities/assignment.entity';
import { AssignmentResponseDto, EligibleStaffDto } from '../dto/assignment.dto';
import { ClockService } from '../../common/clock/clock.service';
import { Temporal } from '@js-temporal/polyfill';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly assignmentRepo: AssignmentRepository,
    private readonly shiftRepo: ShiftRepository,
    private readonly shiftSkillRepo: ShiftSkillRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly constraintService: SchedulingConstraintService,
    private readonly eventRepo: DomainEventRepository,
    private readonly clockService: ClockService,
  ) {}

  async getAssignmentsForSlot(
    slotId: number,
  ): Promise<AssignmentResponseDto[]> {
    const assignments = await this.assignmentRepo.findByShiftSkillId(slotId);

    return assignments.map((a) => ({
      assignmentId: a.id,
      staffMemberId: a.staffMemberId,
      staffName: a.staffMember?.user?.name || 'Unknown',
      state: a.state,
    }));
  }

  async getAssignmentsForShiftAndSlot(
    shiftId: number,
    slotId: number,
  ): Promise<AssignmentResponseDto[]> {
    const slot = await this.shiftSkillRepo.findByIdAndShiftId(slotId, shiftId);
    if (!slot) throw new NotFoundException('Shift skill slot not found');

    return this.getAssignmentsForSlot(slotId);
  }

  async assignStaff(
    shiftId: number,
    slotId: number,
    staffMemberId: number,
    managerId?: number,
  ): Promise<AssignmentResponseDto> {
    const maybeShift = await this.shiftRepo.findById(shiftId);
    if (maybeShift.isNothing) throw new NotFoundException('Shift not found');

    const maybeSlot = await this.shiftSkillRepo.findByIdAndShiftId(
      slotId,
      shiftId,
    );
    if (!maybeSlot) throw new NotFoundException('Shift skill slot not found');

    const maybeEmployee = await this.employeeRepo.findById(staffMemberId);
    if (maybeEmployee.isNothing)
      throw new NotFoundException('Employee not found');
    const employee = maybeEmployee.value;

    const constraintResult = await this.constraintService.validate(
      { staffMemberId, shiftSkillId: slotId, shiftId },
      employee,
      maybeShift.value.startTime,
      maybeShift.value.endTime,
    );

    if (constraintResult.violations.length > 0) {
      throw new BadRequestException({
        message: 'Constraint violations prevented assignment',
        violations: constraintResult.violations,
      });
    }

    const result = await this.assignmentRepo.createWithLock(
      slotId,
      staffMemberId,
      managerId,
      undefined,
    );

    if (result.isErr) {
      const msg = result.error.message;

      if (
        msg.includes('headcount reached') ||
        msg.includes('overlapping assignment')
      ) {
        throw new ConflictException(msg);
      }

      this.logger.error('Failed to create assignment', result.error);
      throw new InternalServerErrorException('Failed to create assignment');
    }

    const assignment = result.value;

    const overallState = await this.shiftRepo.deriveFillState(shiftId);
    await this.shiftRepo.updateState(shiftId, overallState);

    const eventPayload: AssignmentCreatedEvent = {
      assignmentId: assignment.id,
      shiftSkillId: slotId,
      shiftId,
      staffMemberId,
      assignedByManagerId: managerId,
      timestamp: this.clockService.now().toString(),
    };

    await this.eventRepo.append({
      aggregateType: 'Assignment',
      aggregateId: assignment.id,
      eventType: SchedulingEventPatterns.ASSIGNMENT_CREATED,
      payload: eventPayload as unknown as Record<string, unknown>,
      actorId: managerId,
    });

    return {
      assignmentId: assignment.id,
      staffMemberId,
      staffName: employee.user?.name || 'Unknown',
      state: assignment.state,
    };
  }

  async removeAssignment(
    shiftId: number,
    slotId: number,
    assignmentId: number,
    managerId?: number,
    reason = 'Removed by manager',
  ): Promise<void> {
    const assignment = await this.assignmentRepo.findById(assignmentId);

    if (!assignment || assignment.shiftSkillId !== slotId) {
      throw new NotFoundException('Assignment not found');
    }

    const slot = await this.shiftSkillRepo.findByIdAndShiftId(slotId, shiftId);
    if (!slot) throw new NotFoundException('Shift skill slot not found');

    const actualShiftId = slot.shiftId;
    const staffMemberId = assignment.staffMemberId;

    const cancelResult = await this.assignmentRepo.updateState(
      assignmentId,
      AssignmentState.CANCELLED,
    );
    if (cancelResult.isErr) {
      this.logger.error('Failed to cancel assignment', cancelResult.error);
      throw new InternalServerErrorException('Failed to cancel assignment');
    }

    const overallState = await this.shiftRepo.deriveFillState(actualShiftId);
    await this.shiftRepo.updateState(actualShiftId, overallState);

    const eventPayload: AssignmentRemovedEvent = {
      assignmentId,
      shiftSkillId: slotId,
      shiftId: actualShiftId,
      staffMemberId,
      removedByManagerId: managerId,
      reason,
      timestamp: this.clockService.now().toString(),
    };

    await this.eventRepo.append({
      aggregateType: 'Assignment',
      aggregateId: assignmentId,
      eventType: SchedulingEventPatterns.ASSIGNMENT_REMOVED,
      payload: eventPayload as unknown as Record<string, unknown>,
      actorId: managerId,
    });
  }

  async getEligibleStaff(
    shiftId: number,
    slotId: number,
  ): Promise<EligibleStaffDto[]> {
    const maybeShift = await this.shiftRepo.findById(shiftId);
    if (maybeShift.isNothing) throw new NotFoundException('Shift not found');
    const shift = maybeShift.value;

    const slot = await this.shiftSkillRepo.findByIdAndShiftId(slotId, shiftId);
    if (!slot) throw new NotFoundException('Shift skill slot not found');

    const employees = await this.employeeRepo.findAllWithUser();

    const [weekStart, weekEnd] = this.getWeekBounds(shift.startTime);

    const eligibleStaff: EligibleStaffDto[] = [];

    for (const employee of employees) {
      const result = await this.constraintService.validate(
        { staffMemberId: employee.id, shiftSkillId: slotId, shiftId },
        employee,
        shift.startTime,
        shift.endTime,
      );

      if (result.violations.length === 0) {
        const hoursThisWeek =
          await this.assignmentRepo.sumHoursByStaffMemberInWeek(
            employee.id,
            weekStart,
            weekEnd,
          );

        eligibleStaff.push({
          staffMemberId: employee.id,
          name: employee.user?.name || 'Unknown',
          hoursThisWeek,
          warnings: result.warnings.map((w) => ({
            code: w.code,
            message: w.message,
          })),
        });
      }
    }

    return eligibleStaff;
  }

  private getWeekBounds(date: Date): [Date, Date] {
    const instant = Temporal.Instant.from(date.toISOString());
    const zdt = instant.toZonedDateTimeISO('UTC');
    const dayOfWeek = zdt.dayOfWeek; // 1=Monday, ..., 7=Sunday

    const monday = zdt
      .subtract({ days: dayOfWeek - 1 })
      .withPlainTime({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    const sunday = monday
      .add({ days: 6 })
      .withPlainTime({ hour: 23, minute: 59, second: 59, millisecond: 999 });

    return [
      new Date(monday.toInstant().toString()),
      new Date(sunday.toInstant().toString()),
    ];
  }
}
