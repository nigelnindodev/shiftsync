import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManagerLocation } from '../entities/manager-location.entity';
import { Result } from 'true-myth';

@Injectable()
export class ManagerLocationRepository {
  private readonly logger = new Logger(ManagerLocationRepository.name);

  constructor(
    @InjectRepository(ManagerLocation)
    private readonly repo: Repository<ManagerLocation>,
  ) {}

  async assignLocation(
    managerId: number,
    locationId: number,
  ): Promise<Result<ManagerLocation, Error>> {
    try {
      const existing = await this.repo.findOne({
        where: { managerId, locationId },
      });
      if (existing) return Result.ok(existing);
      const ml = this.repo.create({ managerId, locationId });
      const saved = await this.repo.save(ml);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(
        `Failed to assign location ${locationId} to manager ${managerId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to assign location'),
      );
    }
  }

  async findLocationsByManager(managerId: number): Promise<ManagerLocation[]> {
    return this.repo.find({ where: { managerId } });
  }

  async findManagersByLocation(locationId: number): Promise<ManagerLocation[]> {
    return this.repo.find({ where: { locationId } });
  }

  async isManagerOfLocation(
    managerId: number,
    locationId: number,
  ): Promise<boolean> {
    const found = await this.repo.findOne({ where: { managerId, locationId } });
    return found !== null;
  }
}
