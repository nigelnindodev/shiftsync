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
  SwapRequestedEvent,
  SwapAcceptedEvent,
  SwapApprovedEvent,
  SwapRejectedEvent,
  DropRequestedEvent,
  DropClaimedEvent,
  DropApprovedEvent,
  DropRejectedEvent,
} from '../events/scheduling-events';
import { AssignmentState } from '../entities/assignment.entity';
import { AssignmentResponseDto, EligibleStaffDto } from '../dto/assignment.dto';
import { ClockService } from '../../common/clock/clock.service';
import { Temporal } from '@js-temporal/polyfill';

const MAX_PENDING_SWAP_DROP = 3;

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

  async requestSwap(
    assignmentId: number,
    targetStaffMemberId: number,
    staffMemberId: number,
  ): Promise<void> {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.staffMemberId !== staffMemberId) {
      throw new BadRequestException('You can only swap your own assignments');
    }
    if (assignment.state !== AssignmentState.ASSIGNED) {
      throw new BadRequestException(
        'Can only request swap on ASSIGNED assignments',
      );
    }

    const maybeTarget = await this.employeeRepo.findById(targetStaffMemberId);
    if (maybeTarget.isNothing)
      throw new NotFoundException('Target staff member not found');

    const pendingCount =
      await this.assignmentRepo.countPendingRequests(staffMemberId);
    if (pendingCount >= MAX_PENDING_SWAP_DROP) {
      throw new BadRequestException(
        `Maximum ${MAX_PENDING_SWAP_DROP} pending swap/drop requests allowed`,
      );
    }

    const stateResult = await this.assignmentRepo.updateStateWithSwapTarget(
      assignmentId,
      AssignmentState.SWAP_REQUESTED,
      targetStaffMemberId,
    );
    if (stateResult.isErr) {
      this.logger.error('Failed to request swap', stateResult.error);
      throw new InternalServerErrorException('Failed to request swap');
    }

    const fullAssignment =
      await this.assignmentRepo.findByIdWithRelations(assignmentId);
    const shiftId = fullAssignment?.shiftSkill?.shiftId ?? 0;

    await this.eventRepo.append({
      aggregateType: 'Assignment',
      aggregateId: assignmentId,
      eventType: SchedulingEventPatterns.SWAP_REQUESTED,
      payload: {
        assignmentId,
        staffMemberId,
        targetStaffMemberId,
        shiftSkillId: assignment.shiftSkillId,
        shiftId,
        timestamp: this.clockService.now().toString(),
      } satisfies SwapRequestedEvent as unknown as Record<string, unknown>,
      actorId: staffMemberId,
    });
  }

  async acceptSwap(assignmentId: number, staffMemberId: number): Promise<void> {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.state !== AssignmentState.SWAP_REQUESTED) {
      throw new BadRequestException(
        'Assignment is not in SWAP_REQUESTED state',
      );
    }
    if (assignment.swapTargetId !== staffMemberId) {
      throw new BadRequestException('You are not the target of this swap');
    }

    const fullAssignment =
      await this.assignmentRepo.findByIdWithRelations(assignmentId);
    if (!fullAssignment?.shiftSkill?.shiftId) {
      throw new NotFoundException('Shift not found for assignment');
    }
    const shiftId = fullAssignment.shiftSkill.shiftId;

    const maybeShift = await this.shiftRepo.findById(shiftId);
    if (maybeShift.isNothing) throw new NotFoundException('Shift not found');
    const shift = maybeShift.value;

    const maybeEmployee = await this.employeeRepo.findById(staffMemberId);
    if (maybeEmployee.isNothing)
      throw new NotFoundException('Employee not found');

    const constraintResult = await this.constraintService.validate(
      {
        staffMemberId,
        shiftSkillId: assignment.shiftSkillId,
        shiftId,
      },
      maybeEmployee.value,
      shift.startTime,
      shift.endTime,
    );

    if (constraintResult.violations.length > 0) {
      throw new BadRequestException({
        message: 'Constraint violations prevented swap acceptance',
        violations: constraintResult.violations,
      });
    }

    const pendingCount =
      await this.assignmentRepo.countPendingRequests(staffMemberId);
    if (pendingCount >= MAX_PENDING_SWAP_DROP) {
      throw new BadRequestException(
        `Maximum ${MAX_PENDING_SWAP_DROP} pending swap/drop requests allowed`,
      );
    }

    const createResult = await this.assignmentRepo.createWithLock(
      assignment.shiftSkillId,
      staffMemberId,
      undefined,
      undefined,
    );

    if (createResult.isErr) {
      const msg = createResult.error.message;
      if (
        msg.includes('headcount reached') ||
        msg.includes('overlapping assignment')
      ) {
        throw new ConflictException(msg);
      }
      this.logger.error('Failed to create swap assignment', createResult.error);
      throw new InternalServerErrorException(
        'Failed to create swap assignment',
      );
    }

    const newAssignment = createResult.value;

    await this.assignmentRepo.updateStateWithSwapTarget(
      assignmentId,
      AssignmentState.SWAP_PENDING_APPROVAL,
      newAssignment.id,
    );

    await this.assignmentRepo.updateStateWithSwapTarget(
      newAssignment.id,
      AssignmentState.SWAP_PENDING_APPROVAL,
      assignmentId,
    );

    await this.eventRepo.append({
      aggregateType: 'Assignment',
      aggregateId: assignmentId,
      eventType: SchedulingEventPatterns.SWAP_ACCEPTED,
      payload: {
        originalAssignmentId: assignmentId,
        newAssignmentId: newAssignment.id,
        staffMemberId,
        shiftSkillId: assignment.shiftSkillId,
        shiftId,
        timestamp: this.clockService.now().toString(),
      } satisfies SwapAcceptedEvent as unknown as Record<string, unknown>,
      actorId: staffMemberId,
    });
  }

  async requestDrop(
    assignmentId: number,
    staffMemberId: number,
  ): Promise<void> {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.staffMemberId !== staffMemberId) {
      throw new BadRequestException('You can only drop your own assignments');
    }
    if (assignment.state !== AssignmentState.ASSIGNED) {
      throw new BadRequestException(
        'Can only request drop on ASSIGNED assignments',
      );
    }

    const pendingCount =
      await this.assignmentRepo.countPendingRequests(staffMemberId);
    if (pendingCount >= MAX_PENDING_SWAP_DROP) {
      throw new BadRequestException(
        `Maximum ${MAX_PENDING_SWAP_DROP} pending swap/drop requests allowed`,
      );
    }

    const stateResult = await this.assignmentRepo.updateState(
      assignmentId,
      AssignmentState.DROP_REQUESTED,
    );
    if (stateResult.isErr) {
      this.logger.error('Failed to request drop', stateResult.error);
      throw new InternalServerErrorException('Failed to request drop');
    }

    const fullAssignment =
      await this.assignmentRepo.findByIdWithRelations(assignmentId);
    const shiftId = fullAssignment?.shiftSkill?.shiftId ?? 0;

    await this.eventRepo.append({
      aggregateType: 'Assignment',
      aggregateId: assignmentId,
      eventType: SchedulingEventPatterns.DROP_REQUESTED,
      payload: {
        assignmentId,
        staffMemberId,
        shiftSkillId: assignment.shiftSkillId,
        shiftId,
        timestamp: this.clockService.now().toString(),
      } satisfies DropRequestedEvent as unknown as Record<string, unknown>,
      actorId: staffMemberId,
    });
  }

  async claimDrop(assignmentId: number, staffMemberId: number): Promise<void> {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.state !== AssignmentState.DROP_REQUESTED) {
      throw new BadRequestException(
        'Assignment is not in DROP_REQUESTED state',
      );
    }
    if (assignment.staffMemberId === staffMemberId) {
      throw new BadRequestException('Cannot claim your own drop request');
    }

    const fullAssignment =
      await this.assignmentRepo.findByIdWithRelations(assignmentId);
    if (!fullAssignment?.shiftSkill?.shiftId) {
      throw new NotFoundException('Shift not found for assignment');
    }
    const shiftId = fullAssignment.shiftSkill.shiftId;

    const maybeShift = await this.shiftRepo.findById(shiftId);
    if (maybeShift.isNothing) throw new NotFoundException('Shift not found');
    const shift = maybeShift.value;

    const maybeEmployee = await this.employeeRepo.findById(staffMemberId);
    if (maybeEmployee.isNothing)
      throw new NotFoundException('Employee not found');

    const constraintResult = await this.constraintService.validate(
      {
        staffMemberId,
        shiftSkillId: assignment.shiftSkillId,
        shiftId,
      },
      maybeEmployee.value,
      shift.startTime,
      shift.endTime,
    );

    if (constraintResult.violations.length > 0) {
      throw new BadRequestException({
        message: 'Constraint violations prevented drop claim',
        violations: constraintResult.violations,
      });
    }

    const pendingCount =
      await this.assignmentRepo.countPendingRequests(staffMemberId);
    if (pendingCount >= MAX_PENDING_SWAP_DROP) {
      throw new BadRequestException(
        `Maximum ${MAX_PENDING_SWAP_DROP} pending swap/drop requests allowed`,
      );
    }

    const createResult = await this.assignmentRepo.createWithLock(
      assignment.shiftSkillId,
      staffMemberId,
      undefined,
      undefined,
    );

    if (createResult.isErr) {
      const msg = createResult.error.message;
      if (
        msg.includes('headcount reached') ||
        msg.includes('overlapping assignment')
      ) {
        throw new ConflictException(msg);
      }
      this.logger.error(
        'Failed to create drop claim assignment',
        createResult.error,
      );
      throw new InternalServerErrorException('Failed to create drop claim');
    }

    const newAssignment = createResult.value;

    await this.assignmentRepo.updateStateWithSwapTarget(
      assignmentId,
      AssignmentState.DROP_REQUESTED,
      newAssignment.id,
    );

    await this.assignmentRepo.updateStateWithSwapTarget(
      newAssignment.id,
      AssignmentState.DROP_PENDING_APPROVAL,
      assignmentId,
    );

    await this.eventRepo.append({
      aggregateType: 'Assignment',
      aggregateId: assignmentId,
      eventType: SchedulingEventPatterns.DROP_CLAIMED,
      payload: {
        originalAssignmentId: assignmentId,
        newAssignmentId: newAssignment.id,
        claimedByStaffId: staffMemberId,
        shiftSkillId: assignment.shiftSkillId,
        shiftId,
        timestamp: this.clockService.now().toString(),
      } satisfies DropClaimedEvent as unknown as Record<string, unknown>,
      actorId: staffMemberId,
    });
  }

  async approveSwapDrop(
    assignmentId: number,
    managerId: number,
    approved: boolean,
  ): Promise<void> {
    const assignment = await this.assignmentRepo.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const isSwap =
      assignment.state === AssignmentState.SWAP_REQUESTED ||
      assignment.state === AssignmentState.SWAP_PENDING_APPROVAL;
    const isDrop =
      assignment.state === AssignmentState.DROP_REQUESTED ||
      assignment.state === AssignmentState.DROP_PENDING_APPROVAL;

    if (!isSwap && !isDrop) {
      throw new BadRequestException(
        'Assignment is not in a pending swap/drop state',
      );
    }

    const fullAssignment =
      await this.assignmentRepo.findByIdWithRelations(assignmentId);
    const shiftId = fullAssignment?.shiftSkill?.shiftId ?? 0;

    if (approved) {
      await this.resolveApproved(assignmentId, assignment, shiftId, managerId);
    } else {
      await this.resolveRejected(
        assignmentId,
        assignment,
        isSwap,
        shiftId,
        managerId,
      );
    }

    await this.shiftRepo
      .deriveFillState(shiftId)
      .then((state) => this.shiftRepo.updateState(shiftId, state));
  }

  private async resolveApproved(
    assignmentId: number,
    assignment: {
      id: number;
      staffMemberId: number;
      shiftSkillId: number;
      state: AssignmentState;
      swapTargetId?: number;
    },
    shiftId: number,
    managerId: number,
  ): Promise<void> {
    const partnerAssignmentId = assignment.swapTargetId;
    if (!partnerAssignmentId) {
      throw new BadRequestException(
        'No partner assignment found for this swap/drop',
      );
    }

    const cancelResult = await this.assignmentRepo.updateState(
      assignmentId,
      AssignmentState.CANCELLED,
    );
    if (cancelResult.isErr) {
      this.logger.error('Failed to cancel original', cancelResult.error);
      throw new InternalServerErrorException('Failed to approve swap/drop');
    }

    await this.assignmentRepo.updateStateWithSwapTarget(
      partnerAssignmentId,
      AssignmentState.ASSIGNED,
      null,
    );

    const isSwap =
      assignment.state === AssignmentState.SWAP_REQUESTED ||
      assignment.state === AssignmentState.SWAP_PENDING_APPROVAL;
    const eventType = isSwap
      ? SchedulingEventPatterns.SWAP_APPROVED
      : SchedulingEventPatterns.DROP_APPROVED;

    await this.eventRepo.append({
      aggregateType: 'Assignment',
      aggregateId: assignmentId,
      eventType,
      payload: {
        originalAssignmentId: assignmentId,
        newAssignmentId: partnerAssignmentId,
        approvedByManagerId: managerId,
        shiftId,
        timestamp: this.clockService.now().toString(),
      } satisfies SwapApprovedEvent | DropApprovedEvent as unknown as Record<
        string,
        unknown
      >,
      actorId: managerId,
    });
  }

  private async resolveRejected(
    assignmentId: number,
    assignment: {
      id: number;
      staffMemberId: number;
      shiftSkillId: number;
      state: AssignmentState;
      swapTargetId?: number;
    },
    isSwap: boolean,
    shiftId: number,
    managerId: number,
  ): Promise<void> {
    const partnerAssignmentId = assignment.swapTargetId;

    if (isSwap) {
      await this.assignmentRepo.updateStateWithSwapTarget(
        assignmentId,
        AssignmentState.ASSIGNED,
        null,
      );

      if (partnerAssignmentId) {
        await this.assignmentRepo.updateState(
          partnerAssignmentId,
          AssignmentState.CANCELLED,
        );
      }

      await this.eventRepo.append({
        aggregateType: 'Assignment',
        aggregateId: assignmentId,
        eventType: SchedulingEventPatterns.SWAP_REJECTED,
        payload: {
          originalAssignmentId: assignmentId,
          newAssignmentId: partnerAssignmentId ?? 0,
          rejectedByManagerId: managerId,
          shiftId,
          timestamp: this.clockService.now().toString(),
        } satisfies SwapRejectedEvent as unknown as Record<string, unknown>,
        actorId: managerId,
      });
    } else {
      if (partnerAssignmentId) {
        await this.assignmentRepo.updateState(
          partnerAssignmentId,
          AssignmentState.CANCELLED,
        );
      }

      await this.assignmentRepo.updateState(
        assignmentId,
        AssignmentState.DROP_REQUESTED,
      );

      await this.eventRepo.append({
        aggregateType: 'Assignment',
        aggregateId: assignmentId,
        eventType: SchedulingEventPatterns.DROP_REJECTED,
        payload: {
          originalAssignmentId: assignmentId,
          newAssignmentId: partnerAssignmentId ?? 0,
          rejectedByManagerId: managerId,
          shiftId,
          timestamp: this.clockService.now().toString(),
        } satisfies DropRejectedEvent as unknown as Record<string, unknown>,
        actorId: managerId,
      });
    }
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
