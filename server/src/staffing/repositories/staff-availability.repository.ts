import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StaffAvailability,
  DayOfWeek,
} from '../entities/staff-availability.entity';
import { StaffAvailabilityException } from '../entities/staff-availability-exception.entity';
import { Result } from 'true-myth';

@Injectable()
export class StaffAvailabilityRepository {
  private readonly logger = new Logger(StaffAvailabilityRepository.name);

  constructor(
    @InjectRepository(StaffAvailability)
    private readonly availabilityRepo: Repository<StaffAvailability>,
    @InjectRepository(StaffAvailabilityException)
    private readonly exceptionRepo: Repository<StaffAvailabilityException>,
  ) {}

  async findByStaffMember(staffMemberId: number): Promise<StaffAvailability[]> {
    return this.availabilityRepo.find({ where: { staffMemberId } });
  }

  async findExceptionsForDate(
    staffMemberId: number,
    date: string,
  ): Promise<StaffAvailabilityException[]> {
    return this.exceptionRepo.find({
      where: { staffMemberId, date },
    });
  }

  async findExceptionsForDateRange(
    staffMemberId: number,
    startDate: string,
    endDate: string,
  ): Promise<StaffAvailabilityException[]> {
    return this.exceptionRepo
      .createQueryBuilder('e')
      .where('e.staff_member_id = :staffMemberId', { staffMemberId })
      .andWhere('e.date >= :startDate', { startDate })
      .andWhere('e.date <= :endDate', { endDate })
      .orderBy('e.date', 'ASC')
      .getMany();
  }

  async upsertAvailability(
    staffMemberId: number,
    dayOfWeek: DayOfWeek,
    wallStartTime: string,
    wallEndTime: string,
  ): Promise<Result<StaffAvailability, Error>> {
    try {
      const existing = await this.availabilityRepo.findOne({
        where: { staffMemberId, dayOfWeek, wallStartTime, wallEndTime },
      });
      if (existing) return Result.ok(existing);

      const avail = this.availabilityRepo.create({
        staffMemberId,
        dayOfWeek,
        wallStartTime,
        wallEndTime,
      });
      const saved = await this.availabilityRepo.save(avail);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(
        `Failed to upsert availability for staff ${staffMemberId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to upsert availability'),
      );
    }
  }

  async upsertException(
    staffMemberId: number,
    date: string,
    isAvailable: boolean,
    wallStartTime?: string,
    wallEndTime?: string,
  ): Promise<Result<StaffAvailabilityException, Error>> {
    if ((wallStartTime && !wallEndTime) || (!wallStartTime && wallEndTime)) {
      return Result.err(
        new Error(
          'wallStartTime and wallEndTime must both be provided, or both be omitted',
        ),
      );
    }

    const timeBounds =
      wallStartTime && wallEndTime ? { wallStartTime, wallEndTime } : {};

    try {
      const existing = await this.exceptionRepo.findOne({
        where: { staffMemberId, date, isAvailable, ...timeBounds },
      });
      if (existing) return Result.ok(existing);

      const exception = this.exceptionRepo.create({
        staffMemberId,
        date,
        isAvailable,
        ...timeBounds,
      });
      const saved = await this.exceptionRepo.save(exception);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(
        `Failed to upsert availability exception for staff ${staffMemberId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to upsert exception'),
      );
    }
  }

  async deleteAvailability(id: number): Promise<Result<void, Error>> {
    try {
      await this.availabilityRepo.delete(id);
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to delete availability id: ${id}`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to delete availability'),
      );
    }
  }

  async deleteException(id: number): Promise<Result<void, Error>> {
    try {
      await this.exceptionRepo.delete(id);
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to delete exception id: ${id}`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to delete exception'),
      );
    }
  }
}
