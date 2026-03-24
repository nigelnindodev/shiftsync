import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StaffAvailabilityService } from './staff-availability.service';
import { StaffAvailabilityRepository } from '../../staffing/repositories';
import { clearDatabase } from '../../../test/db-utils';

import { User } from '../../users/entity/user.entity';
import { Employee } from '../../users/entity/employee.entity';
import { Token } from '../../auth/entity/tokens.entity';
import { Location } from '../../staffing/entities/location.entity';
import { Skill } from '../../staffing/entities/skill.entity';
import { StaffSkill } from '../../staffing/entities/staff-skill.entity';
import { LocationCertification } from '../../staffing/entities/location-certification.entity';
import {
  StaffAvailability,
  DayOfWeek,
} from '../../staffing/entities/staff-availability.entity';
import { StaffAvailabilityException } from '../../staffing/entities/staff-availability-exception.entity';
import { ManagerLocation } from '../../staffing/entities/manager-location.entity';
import { EmployeeRole } from '../../users/user.types';

describe('StaffAvailabilityService (Integration)', () => {
  let module: TestingModule;
  let service: StaffAvailabilityService;
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
          StaffAvailabilityException,
          ManagerLocation,
        ]),
      ],
      providers: [StaffAvailabilityService, StaffAvailabilityRepository],
    }).compile();

    service = module.get<StaffAvailabilityService>(StaffAvailabilityService);
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

  describe('getMyAvailability', () => {
    it('returns empty array when no windows exist', async () => {
      const { employee } = await createEmployee();

      const result = await service.getMyAvailability(employee.id);

      expect(result).toEqual([]);
    });

    it('returns existing availability windows', async () => {
      const { employee } = await createEmployee();

      await dataSource.getRepository(StaffAvailability).save({
        staffMemberId: employee.id,
        dayOfWeek: DayOfWeek.MON,
        wallStartTime: '09:00',
        wallEndTime: '17:00',
      });
      await dataSource.getRepository(StaffAvailability).save({
        staffMemberId: employee.id,
        dayOfWeek: DayOfWeek.WED,
        wallStartTime: '10:00',
        wallEndTime: '18:00',
      });

      const result = await service.getMyAvailability(employee.id);

      expect(result).toHaveLength(2);
      const days = result.map((r) => r.dayOfWeek);
      expect(days).toContain(DayOfWeek.MON);
      expect(days).toContain(DayOfWeek.WED);
    });
  });

  describe('upsertAvailability', () => {
    it('creates a new availability window', async () => {
      const { employee } = await createEmployee();

      const result = await service.upsertAvailability(employee.id, {
        dayOfWeek: DayOfWeek.MON,
        wallStartTime: '09:00',
        wallEndTime: '17:00',
      });

      expect(result.id).toBeDefined();
      expect(result.dayOfWeek).toBe(DayOfWeek.MON);
      expect(result.wallStartTime).toBe('09:00');
      expect(result.wallEndTime).toBe('17:00');
    });

    it('returns existing window when duplicate is upserted', async () => {
      const { employee } = await createEmployee();

      const first = await service.upsertAvailability(employee.id, {
        dayOfWeek: DayOfWeek.MON,
        wallStartTime: '09:00',
        wallEndTime: '17:00',
      });

      const second = await service.upsertAvailability(employee.id, {
        dayOfWeek: DayOfWeek.MON,
        wallStartTime: '09:00',
        wallEndTime: '17:00',
      });

      expect(first.id).toBe(second.id);
    });

    it('throws BadRequestException when startTime >= endTime', async () => {
      const { employee } = await createEmployee();

      await expect(
        service.upsertAvailability(employee.id, {
          dayOfWeek: DayOfWeek.MON,
          wallStartTime: '17:00',
          wallEndTime: '09:00',
        }),
      ).rejects.toThrow('wallStartTime must be before wallEndTime');
    });
  });

  describe('deleteAvailability', () => {
    it('deletes an existing availability window', async () => {
      const { employee } = await createEmployee();

      const avail = await dataSource.getRepository(StaffAvailability).save({
        staffMemberId: employee.id,
        dayOfWeek: DayOfWeek.MON,
        wallStartTime: '09:00',
        wallEndTime: '17:00',
      });

      await service.deleteAvailability(employee.id, avail.id);

      const windows = await service.getMyAvailability(employee.id);
      expect(windows).toEqual([]);
    });

    it('throws NotFoundException for non-existent window', async () => {
      const { employee } = await createEmployee();

      await expect(
        service.deleteAvailability(employee.id, 99999),
      ).rejects.toThrow('Availability window not found');
    });
  });

  describe('getExceptions', () => {
    it('returns exceptions within date range', async () => {
      const { employee } = await createEmployee();

      await dataSource.getRepository(StaffAvailabilityException).save({
        staffMemberId: employee.id,
        date: '2026-03-25',
        isAvailable: false,
      });
      await dataSource.getRepository(StaffAvailabilityException).save({
        staffMemberId: employee.id,
        date: '2026-03-28',
        isAvailable: true,
        wallStartTime: '10:00',
        wallEndTime: '14:00',
      });

      const result = await service.getExceptions(employee.id, {
        startDate: '2026-03-24',
        endDate: '2026-03-30',
      });

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-03-25');
      expect(result[1].date).toBe('2026-03-28');
    });

    it('returns empty array when no exceptions exist', async () => {
      const { employee } = await createEmployee();

      const result = await service.getExceptions(employee.id, {
        startDate: '2026-03-24',
        endDate: '2026-03-30',
      });

      expect(result).toEqual([]);
    });

    it('excludes exceptions outside date range', async () => {
      const { employee } = await createEmployee();

      await dataSource.getRepository(StaffAvailabilityException).save({
        staffMemberId: employee.id,
        date: '2026-03-20',
        isAvailable: false,
      });

      const result = await service.getExceptions(employee.id, {
        startDate: '2026-03-24',
        endDate: '2026-03-30',
      });

      expect(result).toEqual([]);
    });
  });

  describe('upsertException', () => {
    it('creates a new exception', async () => {
      const { employee } = await createEmployee();

      const result = await service.upsertException(employee.id, {
        date: '2026-03-25',
        isAvailable: false,
      });

      expect(result.id).toBeDefined();
      expect(result.date).toBe('2026-03-25');
      expect(result.isAvailable).toBe(false);
    });

    it('creates an exception with time bounds', async () => {
      const { employee } = await createEmployee();

      const result = await service.upsertException(employee.id, {
        date: '2026-03-25',
        isAvailable: true,
        wallStartTime: '10:00',
        wallEndTime: '15:00',
      });

      expect(result.wallStartTime).toBe('10:00');
      expect(result.wallEndTime).toBe('15:00');
    });

    it('throws BadRequestException for invalid time range', async () => {
      const { employee } = await createEmployee();

      await expect(
        service.upsertException(employee.id, {
          date: '2026-03-25',
          isAvailable: true,
          wallStartTime: '15:00',
          wallEndTime: '10:00',
        }),
      ).rejects.toThrow('wallStartTime must be before wallEndTime');
    });
  });

  describe('deleteException', () => {
    it('deletes an existing exception', async () => {
      const { employee } = await createEmployee();

      const exception = await dataSource
        .getRepository(StaffAvailabilityException)
        .save({
          staffMemberId: employee.id,
          date: '2026-03-25',
          isAvailable: false,
        });

      await service.deleteException(employee.id, exception.id);

      const exceptions = await service.getExceptions(employee.id, {
        startDate: '2026-03-24',
        endDate: '2026-03-30',
      });
      expect(exceptions).toEqual([]);
    });

    it('throws NotFoundException for non-existent exception', async () => {
      const { employee } = await createEmployee();

      await expect(service.deleteException(employee.id, 99999)).rejects.toThrow(
        'Availability exception not found',
      );
    });
  });
});
