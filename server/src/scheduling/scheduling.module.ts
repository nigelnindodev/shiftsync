import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ShiftTemplate,
  ShiftTemplateSkill,
  Shift,
  ShiftSkill,
  Assignment,
  RecurringAssignment,
  Schedule,
} from './entities';
import {
  ShiftRepository,
  AssignmentRepository,
  ScheduleRepository,
  ShiftTemplateRepository,
  RecurringAssignmentRepository,
  ShiftSkillRepository,
} from './repositories';
import { StaffingModule } from '../staffing/staffing.module';
import { SchedulingConstraintService } from './constraints/scheduling-constraint.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShiftTemplate,
      ShiftTemplateSkill,
      Shift,
      ShiftSkill,
      Assignment,
      RecurringAssignment,
      Schedule,
    ]),
    StaffingModule,
  ],
  providers: [
    ShiftRepository,
    AssignmentRepository,
    ScheduleRepository,
    ShiftTemplateRepository,
    RecurringAssignmentRepository,
    ShiftSkillRepository,
    SchedulingConstraintService,
  ],
  exports: [
    ShiftRepository,
    AssignmentRepository,
    ScheduleRepository,
    ShiftTemplateRepository,
    RecurringAssignmentRepository,
    ShiftSkillRepository,
    SchedulingConstraintService,
  ],
})
export class SchedulingModule {}
