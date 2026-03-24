import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ShiftRepository, ShiftWithSkillSlots } from '../repositories';
import { SkillRepository } from '../../staffing/repositories';
import { DomainEventRepository } from '../repositories';
import { ShiftState } from '../entities/shift.entity';
import {
  SchedulingEventPatterns,
  ShiftCreatedEvent,
  ShiftCancelledEvent,
} from '../events/scheduling-events';
import { ClockService } from '../../common/clock/clock.service';

@Injectable()
export class ShiftService {
  private readonly logger = new Logger(ShiftService.name);

  constructor(
    private readonly shiftRepo: ShiftRepository,
    private readonly skillRepo: SkillRepository,
    private readonly eventRepo: DomainEventRepository,
    private readonly clockService: ClockService,
  ) {}

  async createShift(
    locationId: number,
    startTime: string,
    endTime: string,
    skills: Array<{ skillId: number; headcount: number }>,
    managerId?: number,
  ): Promise<ShiftWithSkillSlots> {
    // Validate start < end
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      throw new BadRequestException('startTime must be before endTime');
    }

    // Validate skills are not empty
    if (!skills || skills.length === 0) {
      throw new BadRequestException('At least one skill slot is required');
    }

    // Validate all skills are active
    for (const slot of skills) {
      const maybeSkill = await this.skillRepo.findById(slot.skillId);
      if (maybeSkill.isNothing) {
        throw new BadRequestException(
          `Skill with id ${slot.skillId} not found`,
        );
      }
      if (!maybeSkill.value.isActive) {
        throw new BadRequestException(
          `Skill "${maybeSkill.value.name}" is deprecated and cannot be used`,
        );
      }
    }

    // Create shift + skill slots
    const result = await this.shiftRepo.create(
      {
        locationId,
        startTime: start,
        endTime: end,
        state: ShiftState.OPEN,
      },
      skills,
    );

    if (result.isErr) {
      this.logger.error('Failed to create shift', result.error);
      throw new BadRequestException('Failed to create shift');
    }

    const shift = result.value;

    // Emit ShiftCreated event
    const eventPayload: ShiftCreatedEvent = {
      shiftId: shift.id,
      locationId,
      startTime,
      endTime,
      skills,
      createdByManagerId: managerId,
      timestamp: this.clockService.now().toString(),
    };

    await this.eventRepo.append({
      aggregateType: 'Shift',
      aggregateId: shift.id,
      eventType: SchedulingEventPatterns.SHIFT_CREATED,
      payload: eventPayload as unknown as Record<string, unknown>,
      actorId: managerId,
    });

    this.logger.log('Shift created', { shiftId: shift.id });
    return shift;
  }

  async getShiftSkillSlots(shiftId: number): Promise<ShiftWithSkillSlots> {
    const maybeShift = await this.shiftRepo.findByIdWithSkillSlots(shiftId);
    if (maybeShift.isNothing) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }
    return maybeShift.value;
  }

  async cancelShift(shiftId: number, managerId?: number): Promise<void> {
    const maybeShift = await this.shiftRepo.findById(shiftId);
    if (maybeShift.isNothing) {
      throw new NotFoundException(`Shift ${shiftId} not found`);
    }

    const shift = maybeShift.value;

    if (
      shift.state === ShiftState.CANCELLED ||
      shift.state === ShiftState.COMPLETED ||
      shift.state === ShiftState.LOCKED
    ) {
      throw new BadRequestException(
        `Cannot cancel shift in state ${shift.state}`,
      );
    }

    // Cancel shift with cascade of pending swap/drop requests (single transaction)
    const result = await this.shiftRepo.cancelWithPendingCascade(shiftId);
    if (result.isErr) {
      this.logger.error('Failed to cancel shift', result.error);
      throw new BadRequestException('Failed to cancel shift');
    }

    // Emit ShiftCancelled event
    const eventPayload: ShiftCancelledEvent = {
      shiftId,
      cancelledByManagerId: managerId,
      timestamp: this.clockService.now().toString(),
    };

    await this.eventRepo.append({
      aggregateType: 'Shift',
      aggregateId: shiftId,
      eventType: SchedulingEventPatterns.SHIFT_CANCELLED,
      payload: eventPayload as unknown as Record<string, unknown>,
      actorId: managerId,
    });

    this.logger.log('Shift cancelled', { shiftId });
  }
}
