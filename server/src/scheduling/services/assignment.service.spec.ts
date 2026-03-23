import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AssignmentService } from './assignment.service';
import { ClockService } from '../../common/clock/clock.service';
import {
  ShiftRepository,
  ShiftSkillRepository,
  AssignmentRepository,
  DomainEventRepository,
} from '../repositories';
import { EmployeeRepository } from '../../users/employee.repository';
import { UsersRepository } from '../../users/users.repository';
import { SchedulingConstraintService } from '../constraints/scheduling-constraint.service';
import { clearDatabase } from '../../../test/db-utils';

import { User } from '../../users/entity/user.entity';
import { Employee } from '../../users/entity/employee.entity';
import { Token } from '../../auth/entity/tokens.entity';
import { Location } from '../../staffing/entities/location.entity';
import { ManagerLocation } from '../../staffing/entities/manager-location.entity';
import { Skill } from '../../staffing/entities/skill.entity';
import { StaffSkill } from '../../staffing/entities/staff-skill.entity';
import { LocationCertification } from '../../staffing/entities/location-certification.entity';
import { StaffAvailability } from '../../staffing/entities/staff-availability.entity';
import { StaffAvailabilityException } from '../../staffing/entities/staff-availability-exception.entity';
import { Shift, ShiftState } from '../entities/shift.entity';
import { ShiftSkill } from '../entities/shift-skill.entity';
import { Assignment, AssignmentState } from '../entities/assignment.entity';
import { DomainEvent } from '../entities/domain-event.entity';
import { SCHEDULING_EVENTS_CLIENT } from '../scheduling.constants';
import { SchedulingEventPatterns } from '../events/scheduling-events';
import { EmployeeRole } from '../../users/user.types';
import {
  StaffSkillRepository,
  LocationCertificationRepository,
  StaffAvailabilityRepository,
} from '../../staffing/repositories';
import { DayOfWeek } from '../../staffing/entities/staff-availability.entity';

describe('AssignmentService (Integration)', () => {
  let module: TestingModule;
  let service: AssignmentService;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.PG_HOST,
          port: parseInt(process.env.PG_PORT || '5432', 10),
          username: process.env.PG_USERNAME,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE,
          entities: [__dirname + '/../../**/*.entity.{ts,js}'],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([
          User,
          Employee,
          Token,
          Location,
          ManagerLocation,
          Skill,
          StaffSkill,
          LocationCertification,
          StaffAvailability,
          StaffAvailabilityException,
          Shift,
          ShiftSkill,
          Assignment,
          DomainEvent,
        ]),
      ],
      providers: [
        AssignmentService,
        AssignmentRepository,
        ShiftRepository,
        ShiftSkillRepository,
        EmployeeRepository,
        UsersRepository,
        DomainEventRepository,
        SchedulingConstraintService,
        StaffSkillRepository,
        LocationCertificationRepository,
        StaffAvailabilityRepository,
        {
          provide: ClockService,
          useValue: { now: () => new Date('2026-03-23T12:00:00Z') },
        },
        {
          provide: SCHEDULING_EVENTS_CLIENT,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  async function createBaseContext() {
    const user = await dataSource
      .getRepository(User)
      .save({ email: 'test@example.com', name: 'Test' });
    const employee = await dataSource.getRepository(Employee).save({
      externalId: user.externalId,
      role: EmployeeRole.STAFF,
      homeTimezone: 'UTC',
      desiredHoursPerWeek: 40,
    });
    const location = await dataSource
      .getRepository(Location)
      .save({ name: 'Loc', timezone: 'UTC', brand: 'Brand' });
    const skill = await dataSource
      .getRepository(Skill)
      .save({ name: 'Skill', isActive: true });

    // Certify and give skill
    await dataSource
      .getRepository(LocationCertification)
      .save({ staffMemberId: employee.id, locationId: location.id });
    await dataSource
      .getRepository(StaffSkill)
      .save({ staffMemberId: employee.id, skillId: skill.id });

    // Add 24/7 availability
    const days = [
      DayOfWeek.MON,
      DayOfWeek.TUE,
      DayOfWeek.WED,
      DayOfWeek.THU,
      DayOfWeek.FRI,
      DayOfWeek.SAT,
      DayOfWeek.SUN,
    ];
    for (const day of days) {
      await dataSource.getRepository(StaffAvailability).save({
        staffMemberId: employee.id,
        dayOfWeek: day,
        wallStartTime: '00:00:00',
        wallEndTime: '23:59:59',
      });
    }

    return { user, employee, location, skill };
  }

  it('should assign eligible staff and transition shift state', async () => {
    const { employee, location, skill } = await createBaseContext();

    const shift = await dataSource.getRepository(Shift).save({
      locationId: location.id,
      startTime: new Date('2026-03-24T10:00:00Z'),
      endTime: new Date('2026-03-24T18:00:00Z'),
      state: ShiftState.OPEN,
    });
    const slot = await dataSource.getRepository(ShiftSkill).save({
      shiftId: shift.id,
      skillId: skill.id,
      headcount: 1,
    });

    const assignmentResponse = await service.assignStaff(
      shift.id,
      slot.id,
      employee.id,
      999,
    );

    expect(assignmentResponse.assignmentId).toBeDefined();
    expect(assignmentResponse.state).toBe(AssignmentState.ASSIGNED);

    // Verify shift state transition (1/1 filled)
    const updatedShift = await dataSource
      .getRepository(Shift)
      .findOneBy({ id: shift.id });
    expect(updatedShift?.state).toBe(ShiftState.FILLED);

    // Verify event
    const events = await dataSource.getRepository(DomainEvent).find({
      where: { eventType: SchedulingEventPatterns.ASSIGNMENT_CREATED },
    });
    expect(events).toHaveLength(1);
    expect(events[0].aggregateId).toBe(assignmentResponse.assignmentId);
  });

  it('should reject assignment if constraints fail', async () => {
    const { employee, location, skill } = await createBaseContext();

    // Clear skill
    await dataSource
      .getRepository(StaffSkill)
      .delete({ staffMemberId: employee.id });

    const shift = await dataSource.getRepository(Shift).save({
      locationId: location.id,
      startTime: new Date('2026-03-24T10:00:00Z'),
      endTime: new Date('2026-03-24T18:00:00Z'),
      state: ShiftState.OPEN,
    });
    const slot = await dataSource.getRepository(ShiftSkill).save({
      shiftId: shift.id,
      skillId: skill.id,
      headcount: 1,
    });

    await expect(
      service.assignStaff(shift.id, slot.id, employee.id),
    ).rejects.toThrow('Constraint violations');
  });

  it('should remove an assignment and recalculate shift state', async () => {
    const { employee, location, skill } = await createBaseContext();
    const shift = await dataSource.getRepository(Shift).save({
      locationId: location.id,
      startTime: new Date('2026-03-24T10:00:00Z'),
      endTime: new Date('2026-03-24T18:00:00Z'),
      state: ShiftState.FILLED,
    });
    const slot = await dataSource.getRepository(ShiftSkill).save({
      shiftId: shift.id,
      skillId: skill.id,
      headcount: 1,
    });
    const assignment = await dataSource.getRepository(Assignment).save({
      shiftSkillId: slot.id,
      staffMemberId: employee.id,
      state: AssignmentState.ASSIGNED,
    });

    await service.removeAssignment(shift.id, slot.id, assignment.id, 999);

    const updatedAssignment = await dataSource
      .getRepository(Assignment)
      .findOneBy({ id: assignment.id });
    expect(updatedAssignment?.state).toBe(AssignmentState.CANCELLED);

    const updatedShift = await dataSource
      .getRepository(Shift)
      .findOneBy({ id: shift.id });
    expect(updatedShift?.state).toBe(ShiftState.OPEN);
  });
});
