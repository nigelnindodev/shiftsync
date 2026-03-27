import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationCertification } from '../entities/location-certification.entity';
import { Result } from 'true-myth';

@Injectable()
export class LocationCertificationRepository {
  private readonly logger = new Logger(LocationCertificationRepository.name);

  constructor(
    @InjectRepository(LocationCertification)
    private readonly repo: Repository<LocationCertification>,
  ) {}

  async isCertified(
    staffMemberId: number,
    locationId: number,
  ): Promise<boolean> {
    const found = await this.repo.findOne({
      where: { staffMemberId, locationId },
    });
    return found !== null;
  }

  async certify(
    staffMemberId: number,
    locationId: number,
  ): Promise<Result<LocationCertification, Error>> {
    try {
      const existing = await this.repo.findOne({
        where: { staffMemberId, locationId },
      });
      if (existing) return Result.ok(existing);
      const cert = this.repo.create({ staffMemberId, locationId });
      const saved = await this.repo.save(cert);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(
        `Failed to certify staff ${staffMemberId} at location ${locationId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to certify'),
      );
    }
  }

  async revoke(
    staffMemberId: number,
    locationId: number,
  ): Promise<Result<void, Error>> {
    try {
      await this.repo.delete({ staffMemberId, locationId });
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(
        `Failed to revoke certification for staff ${staffMemberId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to revoke certification'),
      );
    }
  }

  async findByStaffMember(
    staffMemberId: number,
  ): Promise<LocationCertification[]> {
    return this.repo.find({ where: { staffMemberId } });
  }

  async findByLocation(locationId: number): Promise<LocationCertification[]> {
    return this.repo.find({
      where: { locationId },
      relations: ['staffMember', 'staffMember.user'],
    });
  }
}
