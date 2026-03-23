import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { of } from 'rxjs';
import { AssignmentService } from './assignment.service';
import { AssignmentRepository } from '../repositories';
import { ShiftRepository } from '../repositories';
import { ShiftSkillRepository } from '../repositories';
import { DomainEventRepository } from '../repositories';
import { EmployeeRepository } from '../../users/employee.repository';
import { SchedulingConstraintService } from '../constraints/scheduling-constraint.service';
import { ClockService } from '../../common/clock/clock.service';
import {
  StaffSkillRepository,
  LocationCertificationRepository,
  StaffAvailabilityRepository,
} from '../../staffing/repositories';
import { clearDatabase } from '../../../test/db-utils';

import { User } from '../../users/entity/user.entity';
import { Employee } from '../../users/entity/employee.entity';
import { Token } from '../../auth/entity/tokens.entity';
import { Location } from '../../staffing/entities/location.entity';
import { ManagerLocation } from '../../staffing/entities/manager-location.entity';
import { Skill } from '../../staffing/entities/skill.entity';
import { StaffSkill } from '../../staffing/entities/staff-skill.entity';
import { LocationCertification } from '../../staffing/entities/location-certification.entity';
import {
  StaffAvailability,
  DayOfWeek,
} from '../../staffing/entities/staff-availability.entity';
import { StaffAvailabilityException } from '../../staffing/entities/staff-availability-exception.entity';
import { Shift, ShiftState } from '../entities/shift.entity';
import { ShiftSkill as ShiftSkillEntity } from '../entities/shift-skill.entity';
import { Assignment, AssignmentState } from '../entities/assignment.entity';
import { DomainEvent } from '../entities/domain-event.entity';
import { EmployeeRole } from '../../users/user.types';
import { SchedulingEventPatterns } from '../events/scheduling-events';
import { SCHEDULING_EVENTS_CLIENT } from '../scheduling.constants';

describe('AssignmentService (Integration)', () => {
  let module: TestingModule;
  let assignmentService: AssignmentService;
  let dataSource: DataSource;
  let emitMock: jest.Mock;

  beforeAll(async () => {
    emitMock = jest.fn(() => of(undefined));
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
          ShiftSkillEntity,
          Assignment,
          DomainEvent,
        ]),
      ],
      providers: [
        AssignmentService,
        AssignmentRepository,
        ShiftRepository,
        ShiftSkillRepository,
        DomainEventRepository,
        EmployeeRepository,
        SchedulingConstraintService,
        {
          provide: ClockService,
          useValue: { now: () => new Date('2026-03-23T12:00:00Z') },
        },
        StaffSkillRepository,
        LocationCertificationRepository,
        StaffAvailabilityRepository,
        {
          provide: SCHEDULING_EVENTS_CLIENT,
          useValue: { emit: emitMock },
        },
      ],
    }).compile();

    assignmentService = module.get<AssignmentService>(AssignmentService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
    emitMock.mockClear();
  });

  async function createEmployee(userName = 'Test User') {
    const user = await dataSource.getRepository(User).save({
      email: `${userName.toLowerCase().replace(/ /g, '.')}@example.com`,
      name: userName,
    });
    const employee = await dataSource.getRepository(Employee).save({
      externalId: user.externalId,
      role: EmployeeRole.STAFF,
      homeTimezone: 'UTC',
      desiredHoursPerWeek: 40,
    });
    return { user, employee };
  }

  async function createLocation() {
    return dataSource.getRepository(Location).save({
      name: 'Test Location',
      timezone: 'UTC',
      brand: 'Brand',
    });
  }

  async function createSkill() {
    return dataSource.getRepository(Skill).save({
      name: 'Test Skill',
      isActive: true,
    });
  }

  async function createShiftWithSlot(locationId: number, skillId: number) {
    const shift = await dataSource.getRepository(Shift).save({
      locationId,
      startTime: new Date('2026-03-24T10:00:00Z'),
      endTime: new Date('2026-03-24T18:00:00Z'),
      state: ShiftState.OPEN,
    });
    const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
      shiftId: shift.id,
      skillId,
      headcount: 1,
    });
    return { shift, shiftSkill };
  }

  async function certifyEmployee(
    employeeId: number,
    locationId: number,
    skillId: number,
  ) {
    await dataSource.getRepository(StaffSkill).save({
      staffMemberId: employeeId,
      skillId,
    });
    await dataSource.getRepository(LocationCertification).save({
      staffMemberId: employeeId,
      locationId,
    });
    await dataSource.getRepository(StaffAvailability).save({
      staffMemberId: employeeId,
      dayOfWeek: DayOfWeek.TUE,
      wallStartTime: '08:00:00',
      wallEndTime: '20:00:00',
    });
  }

  describe('assignStaff', () => {
    it('creates assignment when constraints pass and emits AssignmentCreated event', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      const result = await assignmentService.assignStaff(
        shift.id,
        shiftSkill.id,
        employee.id,
      );

      expect(result.assignmentId).toBeDefined();
      expect(result.staffMemberId).toBe(employee.id);
      expect(result.state).toBe(AssignmentState.ASSIGNED);

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.FILLED);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: result.assignmentId },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(
        SchedulingEventPatterns.ASSIGNMENT_CREATED,
      );

      expect(emitMock).toHaveBeenCalledWith(
        SchedulingEventPatterns.ASSIGNMENT_CREATED,
        expect.objectContaining({
          assignmentId: result.assignmentId,
          shiftSkillId: shiftSkill.id,
          shiftId: shift.id,
          staffMemberId: employee.id,
          eventId: events[0].id,
        }),
      );
    });

    it('sets shift state to FILLED when all slots are filled', async () => {
      const { employee: emp1 } = await createEmployee('User 1');
      const { employee: emp2 } = await createEmployee('User 2');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(emp1.id, location.id, skill.id);
      await certifyEmployee(emp2.id, location.id, skill.id);

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.OPEN,
      });
      const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 2,
      });

      await assignmentService.assignStaff(shift.id, shiftSkill.id, emp1.id);
      await assignmentService.assignStaff(shift.id, shiftSkill.id, emp2.id);

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.FILLED);
    });

    it('rejects assignment with constraint violation', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      await expect(
        assignmentService.assignStaff(shift.id, shiftSkill.id, employee.id),
      ).rejects.toThrow('Constraint violations prevented assignment');

      const assignments = await dataSource.getRepository(Assignment).find({
        where: { shiftSkillId: shiftSkill.id },
      });
      expect(assignments).toHaveLength(0);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateType: 'Assignment' },
      });
      expect(events).toHaveLength(0);
    });
  });

  describe('removeAssignment', () => {
    it('cancels assignment and emits AssignmentRemoved event', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: employee.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await assignmentService.removeAssignment(
        shift.id,
        shiftSkill.id,
        assignment.id,
      );

      const updatedAssignment = await dataSource
        .getRepository(Assignment)
        .findOneBy({ id: assignment.id });
      expect(updatedAssignment?.state).toBe(AssignmentState.CANCELLED);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: assignment.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(
        SchedulingEventPatterns.ASSIGNMENT_REMOVED,
      );

      expect(emitMock).toHaveBeenCalledWith(
        SchedulingEventPatterns.ASSIGNMENT_REMOVED,
        expect.objectContaining({
          assignmentId: assignment.id,
          shiftSkillId: shiftSkill.id,
          shiftId: shift.id,
          staffMemberId: employee.id,
          eventId: events[0].id,
        }),
      );
    });

    it('recalculates shift state after removal', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(employee.id, location.id, skill.id);

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.FILLED,
      });
      const shiftSkill = await dataSource.getRepository(ShiftSkillEntity).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 1,
      });

      const assignment = await dataSource.getRepository(Assignment).save({
        staffMemberId: employee.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      await assignmentService.removeAssignment(
        shift.id,
        shiftSkill.id,
        assignment.id,
      );

      const updatedShift = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updatedShift?.state).toBe(ShiftState.OPEN);
    });

    it('throws NotFoundException for non-existent assignment', async () => {
      const location = await createLocation();
      const skill = await createSkill();
      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      await expect(
        assignmentService.removeAssignment(shift.id, shiftSkill.id, 99999),
      ).rejects.toThrow('Assignment not found');
    });
  });

  describe('getAssignmentsForSlot', () => {
    it('returns assignments for a slot', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();

      const { shiftSkill } = await createShiftWithSlot(location.id, skill.id);

      await dataSource.getRepository(Assignment).save({
        staffMemberId: employee.id,
        shiftSkillId: shiftSkill.id,
        state: AssignmentState.ASSIGNED,
      });

      const result = await assignmentService.getAssignmentsForSlot(
        shiftSkill.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0].staffMemberId).toBe(employee.id);
    });
  });

  describe('getEligibleStaff', () => {
    it('returns only staff who pass constraints', async () => {
      const { employee: eligibleEmp } = await createEmployee('Eligible User');
      await createEmployee('Ineligible User');
      const location = await createLocation();
      const skill = await createSkill();
      await certifyEmployee(eligibleEmp.id, location.id, skill.id);

      const { shift, shiftSkill } = await createShiftWithSlot(
        location.id,
        skill.id,
      );

      const result = await assignmentService.getEligibleStaff(
        shift.id,
        shiftSkill.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0].staffMemberId).toBe(eligibleEmp.id);
    });
  });
});
