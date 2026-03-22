import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule, ScheduleState } from '../entities/schedule.entity';
import { Result } from 'true-myth';

@Injectable()
export class ScheduleRepository {
  private readonly logger = new Logger(ScheduleRepository.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly repo: Repository<Schedule>,
  ) {}

  async findById(id: number): Promise<Schedule | null> {
    return this.repo.findOneBy({ id });
  }

  async findByLocationAndWeek(
    locationId: number,
    weekOf: string,
  ): Promise<Schedule | null> {
    return this.repo.findOne({ where: { locationId, weekOf } });
  }

  async create(
    data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<Schedule, Error>> {
    try {
      const schedule = this.repo.create(data as Schedule);
      const saved = await this.repo.save(schedule);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(
        `Failed to create schedule for location ${data.locationId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to create schedule'),
      );
    }
  }

  async updateState(
    id: number,
    state: ScheduleState,
    additionalFields?: Partial<Schedule>,
  ): Promise<Result<void, Error>> {
    try {
      await this.repo.update(id, { state, ...additionalFields });
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to update schedule ${id}`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to update schedule'),
      );
    }
  }

  async findByLocation(locationId: number): Promise<Schedule[]> {
    return this.repo.find({
      where: { locationId },
      order: { weekOf: 'DESC' },
    });
  }
}
