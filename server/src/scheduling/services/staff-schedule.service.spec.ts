import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StaffScheduleService } from './staff-schedule.service';
import { AssignmentRepository } from '../repositories';
import { ClockService } from '../../common/clock/clock.service';
import { clearDatabase } from '../../../test/db-utils';

import { User } from '../../users/entity/user.entity';
import { Employee } from '../../users/entity/employee.entity';
import { Token } from '../../auth/entity/tokens.entity';
import { Location } from '../../staffing/entities/location.entity';
import { Skill } from '../../staffing/entities/skill.entity';
import { StaffSkill } from '../../staffing/entities/staff-skill.entity';
import { LocationCertification } from '../../staffing/entities/location-certification.entity';
import { StaffAvailability } from '../../staffing/entities/staff-availability.entity';
import { Shift, ShiftState } from '../entities/shift.entity';
import { ShiftSkill as ShiftSkillEntity } from '../entities/shift-skill.entity';
import { Assignment, AssignmentState } from '../entities/assignment.entity';
import { DomainEvent } from '../entities/domain-event.entity';
import { EmployeeRole } from '../../users/user.types';
import { SCHEDULING_EVENTS_CLIENT } from '../scheduling.constants';

describe('StaffScheduleService (Integration)', () => {
  let module: TestingModule;
  let service: StaffScheduleService;
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
          Skill,
          StaffSkill,
          LocationCertification,
          StaffAvailability,
          Shift,
          ShiftSkillEntity,
          Assignment,
          DomainEvent,
        ]),
      ],
      providers: [
        StaffScheduleService,
        AssignmentRepository,
        {
          provide: ClockService,
          useValue: {
            now: () => ({ toString: () => '2026-03-23T12:00:00.000Z' }),
          },
        },
        {
          provide: SCHEDULING_EVENTS_CLIENT,
          useValue: { emit: () => ({ subscribe: () => {} }) },
        },
      ],
    }).compile();

    service = module.get<StaffScheduleService>(StaffScheduleService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
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

  async function createLocation(name = 'Test Location', timezone = 'UTC') {
    return dataSource.getRepository(Location).save({
      name,
      timezone,
      brand: 'Brand',
    });
  }

  async function createSkill(name = 'Test Skill') {
    return dataSource.getRepository(Skill).save({
      name,
      isActive: true,
    });
  }

  async function createShift(
    locationId: number,
    startTime: Date,
    endTime: Date,
  ) {
    return dataSource.getRepository(Shift).save({
      locationId,
      startTime,
      endTime,
      state: ShiftState.FILLED,
    });
  }

  async function createShiftSkill(shiftId: number, skillId: number) {
    return dataSource.getRepository(ShiftSkillEntity).save({
      shiftId,
      skillId,
      headcount: 1,
    });
  }

  async function createAssignment(
    shiftSkillId: number,
    staffMemberId: number,
    state: AssignmentState = AssignmentState.ASSIGNED,
  ) {
    return dataSource.getRepository(Assignment).save({
      shiftSkillId,
      staffMemberId,
      state,
    });
  }

  describe('getStaffSchedule', () => {
    it('returns empty array when staff has no assignments', async () => {
      const { employee } = await createEmployee();

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toEqual([]);
    });

    it('returns assignments with correct shift/location/skill details', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation('Downtown');
      const skill = await createSkill('Bartender');
      const shift = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );
      const shiftSkill = await createShiftSkill(shift.id, skill.id);
      await createAssignment(shiftSkill.id, employee.id);

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toHaveLength(1);
      expect(result[0].assignmentId).toBeDefined();
      expect(result[0].shiftId).toBe(shift.id);
      expect(result[0].state).toBe(AssignmentState.ASSIGNED);
      expect(result[0].locationId).toBe(location.id);
      expect(result[0].locationName).toBe('Downtown');
      expect(result[0].locationTimezone).toBe('UTC');
      expect(result[0].skillId).toBe(skill.id);
      expect(result[0].skillName).toBe('Bartender');
    });

    it('returns multiple assignments in chronological order', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();

      const shift1 = await createShift(
        location.id,
        new Date('2026-03-27T10:00:00Z'),
        new Date('2026-03-27T18:00:00Z'),
      );
      const shift2 = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );

      const ss1 = await createShiftSkill(shift1.id, skill.id);
      const ss2 = await createShiftSkill(shift2.id, skill.id);

      await createAssignment(ss1.id, employee.id);
      await createAssignment(ss2.id, employee.id);

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toHaveLength(2);
      expect(result[0].shiftId).toBe(shift2.id);
      expect(result[1].shiftId).toBe(shift1.id);
    });

    it('excludes cancelled assignments', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      const shift = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );
      const shiftSkill = await createShiftSkill(shift.id, skill.id);
      await createAssignment(
        shiftSkill.id,
        employee.id,
        AssignmentState.CANCELLED,
      );

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toEqual([]);
    });

    it('excludes completed assignments', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      const shift = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );
      const shiftSkill = await createShiftSkill(shift.id, skill.id);
      await createAssignment(
        shiftSkill.id,
        employee.id,
        AssignmentState.COMPLETED,
      );

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toEqual([]);
    });

    it('excludes NO_SHOW assignments', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      const shift = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );
      const shiftSkill = await createShiftSkill(shift.id, skill.id);
      await createAssignment(
        shiftSkill.id,
        employee.id,
        AssignmentState.NO_SHOW,
      );

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toEqual([]);
    });

    it('includes SWAP_REQUESTED assignments', async () => {
      const { employee } = await createEmployee();
      const location = await createLocation();
      const skill = await createSkill();
      const shift = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );
      const shiftSkill = await createShiftSkill(shift.id, skill.id);
      await createAssignment(
        shiftSkill.id,
        employee.id,
        AssignmentState.SWAP_REQUESTED,
      );

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toHaveLength(1);
      expect(result[0].state).toBe(AssignmentState.SWAP_REQUESTED);
    });

    it('only returns assignments for the authenticated staff member', async () => {
      const { employee: emp1 } = await createEmployee('Employee 1');
      const { employee: emp2 } = await createEmployee('Employee 2');
      const location = await createLocation();
      const skill = await createSkill();
      const shift = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );
      const shiftSkill = await createShiftSkill(shift.id, skill.id);
      await createAssignment(shiftSkill.id, emp1.id);
      await createAssignment(shiftSkill.id, emp2.id);

      const result = await service.getStaffSchedule(
        emp1.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toHaveLength(1);
      expect(result[0].assignmentId).toBeDefined();
    });

    it('returns assignments within date range including boundaries', async () => {
      const { employee } = await createEmployee('Boundary Test');
      const location = await createLocation('Boundary Location');
      const skill = await createSkill('Boundary Skill');

      const shiftInRange = await createShift(
        location.id,
        new Date('2026-03-25T10:00:00Z'),
        new Date('2026-03-25T18:00:00Z'),
      );
      const shiftOutside = await createShift(
        location.id,
        new Date('2026-03-31T10:00:00Z'),
        new Date('2026-03-31T18:00:00Z'),
      );

      const ss1 = await createShiftSkill(shiftInRange.id, skill.id);
      const ss2 = await createShiftSkill(shiftOutside.id, skill.id);

      await createAssignment(ss1.id, employee.id);
      await createAssignment(ss2.id, employee.id);

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      expect(result).toHaveLength(1);
      expect(result[0].shiftId).toBe(shiftInRange.id);
    });

    it('handles exact boundary times correctly', async () => {
      const { employee } = await createEmployee('Edge Case Test');
      const location = await createLocation('Edge Location');
      const skill = await createSkill('Edge Skill');

      const shiftAtStart = await createShift(
        location.id,
        new Date('2026-03-24T00:00:00Z'),
        new Date('2026-03-24T08:00:00Z'),
      );
      const shiftAtEnd = await createShift(
        location.id,
        new Date('2026-03-30T23:59:00Z'),
        new Date('2026-03-31T08:00:00Z'),
      );
      const shiftJustBeforeEnd = await createShift(
        location.id,
        new Date('2026-03-30T23:59:59Z'),
        new Date('2026-03-31T08:00:00Z'),
      );
      const shiftAfterEnd = await createShift(
        location.id,
        new Date('2026-03-31T00:00:00Z'),
        new Date('2026-03-31T08:00:00Z'),
      );

      const ss1 = await createShiftSkill(shiftAtStart.id, skill.id);
      const ss2 = await createShiftSkill(shiftAtEnd.id, skill.id);
      const ss3 = await createShiftSkill(shiftJustBeforeEnd.id, skill.id);
      const ss4 = await createShiftSkill(shiftAfterEnd.id, skill.id);

      await createAssignment(ss1.id, employee.id);
      await createAssignment(ss2.id, employee.id);
      await createAssignment(ss3.id, employee.id);
      await createAssignment(ss4.id, employee.id);

      const result = await service.getStaffSchedule(
        employee.id,
        '2026-03-24',
        '2026-03-30',
      );

      const shiftIds = result.map((r) => r.shiftId);
      expect(shiftIds).toContain(shiftAtStart.id);
      expect(shiftIds).toContain(shiftAtEnd.id);
      expect(shiftIds).toContain(shiftJustBeforeEnd.id);
      expect(shiftIds).not.toContain(shiftAfterEnd.id);
    });

    it('throws BadRequestException when startDate >= endDate', async () => {
      const { employee } = await createEmployee();

      await expect(
        service.getStaffSchedule(employee.id, '2026-03-30', '2026-03-24'),
      ).rejects.toThrow('startDate must be before endDate');
    });
  });
});
