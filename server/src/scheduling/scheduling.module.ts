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
  Notification,
} from './entities';
import {
  ShiftRepository,
  AssignmentRepository,
  ScheduleRepository,
  ShiftTemplateRepository,
  RecurringAssignmentRepository,
  ShiftSkillRepository,
  DomainEventRepository,
  NotificationRepository,
} from './repositories';
import { StaffingModule } from '../staffing/staffing.module';
import { UsersModule } from '../users/users.module';
import { SecurityModule } from '../security/security.module';
import { SchedulingConstraintService } from './constraints/scheduling-constraint.service';
import { ShiftService } from './services/shift.service';
import { AssignmentService } from './services/assignment.service';
import { StaffScheduleService } from './services/staff-schedule.service';
import { StaffAvailabilityService } from './services/staff-availability.service';
import { ShiftController } from './controllers/shift.controller';
import { AssignmentController } from './controllers/assignment.controller';
import { StaffScheduleController } from './controllers/staff-schedule.controller';
import { StaffAvailabilityController } from './controllers/staff-availability.controller';
import { StaffSwapDropController } from './controllers/staff-swap-drop.controller';
import { ApprovalsController } from './controllers/approvals.controller';
import { ReferenceController } from './controllers/reference.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SCHEDULING_EVENTS_CLIENT } from './scheduling.constants';
import { AppConfigService } from '../config';
import { SchedulingReferenceService } from './services/scheduling-reference.service';
import { NotificationGateway } from './services/notification-gateway.service';
import { NotificationEventController } from './controllers/notification-event.controller';
import { NotificationController } from './controllers/notification.controller';
import { CommonModule } from '../common/common.module';

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
      Notification,
    ]),
    StaffingModule,
    UsersModule,
    CommonModule,
    SecurityModule,
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
  controllers: [
    ReferenceController,
    ApprovalsController,
    ShiftController,
    AssignmentController,
    StaffScheduleController,
    StaffAvailabilityController,
    StaffSwapDropController,
    NotificationController,
    NotificationEventController,
  ],
  providers: [
    ShiftRepository,
    AssignmentRepository,
    ScheduleRepository,
    ShiftTemplateRepository,
    RecurringAssignmentRepository,
    ShiftSkillRepository,
    DomainEventRepository,
    NotificationRepository,
    NotificationGateway,
    SchedulingConstraintService,
    ShiftService,
    AssignmentService,
    StaffScheduleService,
    StaffAvailabilityService,
    SchedulingReferenceService,
  ],
  exports: [
    ShiftRepository,
    AssignmentRepository,
    ScheduleRepository,
    ShiftTemplateRepository,
    RecurringAssignmentRepository,
    ShiftSkillRepository,
    DomainEventRepository,
    NotificationRepository,
    NotificationGateway,
    SchedulingConstraintService,
    ShiftService,
    AssignmentService,
    StaffScheduleService,
    StaffAvailabilityService,
    SchedulingReferenceService,
  ],
})
export class SchedulingModule {}
