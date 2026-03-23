import {
  BadRequestException,
  Injectable,
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
  ) {}

  async getAssignmentsForSlot(
    slotId: number,
  ): Promise<AssignmentResponseDto[]> {
    const assignments = await this.assignmentRepo.find({
      where: { shiftSkillId: slotId },
      relations: ['staffMember', 'staffMember.user'],
    });

    return assignments.map((a) => ({
      assignmentId: a.id,
      staffMemberId: a.staffMemberId,
      staffName: a.staffMember?.user?.name || 'Unknown',
      state: a.state,
    }));
  }

  async assignStaff(
    shiftId: number,
    slotId: number,
    staffMemberId: number,
    managerId?: number,
  ): Promise<AssignmentResponseDto> {
    const maybeShift = await this.shiftRepo.findById(shiftId);
    if (maybeShift.isNothing) throw new NotFoundException('Shift not found');

    const maybeSlot = await this.shiftSkillRepo.findOne({
      where: { id: slotId, shiftId },
    });
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
      this.logger.error('Failed to create assignment', result.error);
      throw new BadRequestException(result.error.message);
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
      timestamp: new Date().toISOString(),
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

    const staffMemberId = assignment.staffMemberId;

    await this.assignmentRepo.update(assignmentId, {
      state: AssignmentState.CANCELLED,
    });

    const overallState = await this.shiftRepo.deriveFillState(shiftId);
    await this.shiftRepo.updateState(shiftId, overallState);

    const eventPayload: AssignmentRemovedEvent = {
      assignmentId,
      shiftSkillId: slotId,
      shiftId,
      staffMemberId,
      removedByManagerId: managerId,
      reason,
      timestamp: new Date().toISOString(),
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

    const employees = await this.employeeRepo.findAllWithUser();

    const eligibleStaff: EligibleStaffDto[] = [];

    for (const employee of employees) {
      const result = await this.constraintService.validate(
        { staffMemberId: employee.id, shiftSkillId: slotId, shiftId },
        employee,
        shift.startTime,
        shift.endTime,
      );

      if (result.violations.length === 0) {
        eligibleStaff.push({
          staffMemberId: employee.id,
          name: employee.user?.name || 'Unknown',
          hoursThisWeek: 0,
          warnings: result.warnings.map((w) => ({
            code: w.code,
            message: w.message,
          })),
        });
      }
    }

    return eligibleStaff;
  }
}
