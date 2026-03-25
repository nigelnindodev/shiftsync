import { Injectable } from '@nestjs/common';
import { SkillRepository } from '../../staffing/repositories';
import { LocationRepository } from '../../staffing/repositories';

@Injectable()
export class SchedulingReferenceService {
  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly locationRepo: LocationRepository,
  ) {}

  async getAllActiveSkills() {
    return this.skillRepo.findAllActive();
  }

  async getAllLocations() {
    return this.locationRepo.findAll();
  }
}
