import { Injectable } from '@nestjs/common';
import { Skill } from '../../staffing/entities/skill.entity';
import { Location } from '../../staffing/entities/location.entity';
import {
  SkillRepository,
  LocationRepository,
} from '../../staffing/repositories';

@Injectable()
export class SchedulingReferenceService {
  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly locationRepo: LocationRepository,
  ) {}

  async getAllActiveSkills(): Promise<Skill[]> {
    return this.skillRepo.findAllActive();
  }

  async getAllLocations(): Promise<Location[]> {
    return this.locationRepo.findAll();
  }
}
