import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Location,
  Skill,
  StaffSkill,
  LocationCertification,
  StaffAvailability,
  StaffAvailabilityException,
  ManagerLocation,
} from './entities';
import {
  LocationRepository,
  SkillRepository,
  StaffSkillRepository,
  LocationCertificationRepository,
  StaffAvailabilityRepository,
  ManagerLocationRepository,
} from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      Skill,
      StaffSkill,
      LocationCertification,
      StaffAvailability,
      StaffAvailabilityException,
      ManagerLocation,
    ]),
  ],
  providers: [
    LocationRepository,
    SkillRepository,
    StaffSkillRepository,
    LocationCertificationRepository,
    StaffAvailabilityRepository,
    ManagerLocationRepository,
  ],
  exports: [
    LocationRepository,
    SkillRepository,
    StaffSkillRepository,
    LocationCertificationRepository,
    StaffAvailabilityRepository,
    ManagerLocationRepository,
  ],
})
export class StaffingModule {}
