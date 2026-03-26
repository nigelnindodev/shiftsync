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
import { ManagerController } from './http/manager.controller';
import { SecurityModule } from '../security/security.module';
import { UsersModule } from '../users/users.module';

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
    SecurityModule,
    UsersModule,
  ],
  controllers: [ManagerController],
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
