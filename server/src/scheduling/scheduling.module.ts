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
  DomainEvent,
} from './entities';
import {
  ShiftRepository,
  AssignmentRepository,
  ScheduleRepository,
  ShiftTemplateRepository,
  RecurringAssignmentRepository,
  ShiftSkillRepository,
  DomainEventRepository,
} from './repositories';
import { StaffingModule } from '../staffing/staffing.module';
import { UsersModule } from '../users/users.module';
import { SchedulingConstraintService } from './constraints/scheduling-constraint.service';
import { ShiftService } from './services/shift.service';
import { AssignmentService } from './services/assignment.service';
import { StaffScheduleService } from './services/staff-schedule.service';
import { ShiftController } from './controllers/shift.controller';
import { AssignmentController } from './controllers/assignment.controller';
import { StaffScheduleController } from './controllers/staff-schedule.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SCHEDULING_EVENTS_CLIENT } from './scheduling.constants';
import { AppConfigService } from '../config';

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
      DomainEvent,
    ]),
    StaffingModule,
    UsersModule,
    ClientsModule.registerAsync([
      {
        name: SCHEDULING_EVENTS_CLIENT,
        inject: [AppConfigService],
        useFactory: (config: AppConfigService) => ({
          transport: Transport.REDIS,
          options: config.redisConfig,
        }),
      },
    ]),
  ],
  controllers: [ShiftController, AssignmentController, StaffScheduleController],
  providers: [
    ShiftRepository,
    AssignmentRepository,
    ScheduleRepository,
    ShiftTemplateRepository,
    RecurringAssignmentRepository,
    ShiftSkillRepository,
    DomainEventRepository,
    SchedulingConstraintService,
    ShiftService,
    AssignmentService,
    StaffScheduleService,
  ],
  exports: [
    ShiftRepository,
    AssignmentRepository,
    ScheduleRepository,
    ShiftTemplateRepository,
    RecurringAssignmentRepository,
    ShiftSkillRepository,
    DomainEventRepository,
    SchedulingConstraintService,
    ShiftService,
    AssignmentService,
    StaffScheduleService,
  ],
})
export class SchedulingModule {}
