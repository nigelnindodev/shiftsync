import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SchedulingConstraintService } from './scheduling-constraint.service';
import { ClockService } from '../../common/clock/clock.service';
import {
  StaffSkillRepository,
  LocationCertificationRepository,
  StaffAvailabilityRepository,
} from '../../staffing/repositories';
import {
  AssignmentRepository,
  ShiftRepository,
  ShiftSkillRepository,
} from '../repositories';
import { clearDatabase } from '../../../test/db-utils';

import { User } from '../../users/entity/user.entity';
import { UserProfile } from '../../users/entity/profile.entity';
import { Token } from '../../auth/entity/tokens.entity';
import { Location } from '../../staffing/entities/location.entity';
import { ManagerLocation } from '../../staffing/entities/manager-location.entity';
import { Skill } from '../../staffing/entities/skill.entity';
import { StaffSkill } from '../../staffing/entities/staff-skill.entity';
import { LocationCertification } from '../../staffing/entities/location-certification.entity';
import { StaffAvailability, DayOfWeek } from '../../staffing/entities/staff-availability.entity';
import { StaffAvailabilityException } from '../../staffing/entities/staff-availability-exception.entity';
import { Shift, ShiftState } from '../entities/shift.entity';
import { ShiftSkill } from '../entities/shift-skill.entity';
import { Assignment, AssignmentState } from '../entities/assignment.entity';
import { UserRole } from '../../users/user.types';

describe('SchedulingConstraintService (Integration)', () => {
  let module: TestingModule;
  let service: SchedulingConstraintService;
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
          User, UserProfile, Token, Location, ManagerLocation, Skill, StaffSkill, LocationCertification,
          StaffAvailability, StaffAvailabilityException, Shift, ShiftSkill, Assignment
        ]),
      ],
      providers: [
        SchedulingConstraintService,
        { provide: ClockService, useValue: { now: () => new Date('2026-03-23T12:00:00Z') } },
        StaffSkillRepository,
        LocationCertificationRepository,
        StaffAvailabilityRepository,
        AssignmentRepository,
        ShiftRepository,
        ShiftSkillRepository,
      ],
    }).compile();

    service = module.get<SchedulingConstraintService>(SchedulingConstraintService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  // --- Fixtures ---
  async function createBaseContext() {
    const user = await dataSource.getRepository(User).save({ email: 'test@example.com', name: 'Test' });
    const profile = await dataSource.getRepository(UserProfile).save({
      externalId: user.externalId,
      role: UserRole.STAFF,
      homeTimezone: 'UTC',
      desiredHoursPerWeek: 40,
    });
    const location = await dataSource.getRepository(Location).save({ name: 'Loc', timezone: 'UTC', brand: 'Brand' });
    const skill = await dataSource.getRepository(Skill).save({ name: 'Skill' });
    return { user, profile, location, skill };
  }

  async function createShift(locationId: number, skillId: number, startTime: Date, endTime: Date) {
    const shift = await dataSource.getRepository(Shift).save({
      locationId,
      startTime,
      endTime,
      state: ShiftState.OPEN,
    });
    const shiftSkill = await dataSource.getRepository(ShiftSkill).save({
      shiftId: shift.id,
      skillId,
      headcount: 1,
    });
    return { shift, shiftSkill };
  }

  // --- Tests ---

  describe('skill match', () => {
    it('returns VIOLATION when staff lacks required skill', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'SKILL_MISMATCH' }));
    });

    it('passes when staff has the required skill', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(StaffSkill).save({ staffMemberId: profile.id, skillId: skill.id });

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations.find((v) => v.code === 'SKILL_MISMATCH')).toBeUndefined();
    });
  });

  describe('location certification', () => {
    it('returns VIOLATION when staff is not certified', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'NOT_CERTIFIED' }));
    });

    it('passes when staff is certified', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(LocationCertification).save({ staffMemberId: profile.id, locationId: location.id });

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations.find((v) => v.code === 'NOT_CERTIFIED')).toBeUndefined();
    });
  });

  describe('availability — blocking exception', () => {
    it('returns VIOLATION when staff has blocked the date', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(StaffAvailabilityException).save({
        staffMemberId: profile.id,
        date: '2026-03-24',
        isAvailable: false,
      });

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'UNAVAILABLE' }));
    });
  });

  describe('availability — override window', () => {
    it('returns VIOLATION when shift falls outside override window', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(StaffAvailabilityException).save({
        staffMemberId: profile.id,
        date: '2026-03-24',
        isAvailable: true,
        wallStartTime: '20:00:00',
        wallEndTime: '23:00:00',
      });

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'AVAILABILITY_WINDOW_MISMATCH' }));
    });

    it('passes when shift falls within override window', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(StaffAvailabilityException).save({
        staffMemberId: profile.id,
        date: '2026-03-24',
        isAvailable: true,
        wallStartTime: '08:00:00',
        wallEndTime: '20:00:00',
      });

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations.find((v) => v.code === 'AVAILABILITY_WINDOW_MISMATCH')).toBeUndefined();
    });
  });

  describe('availability — recurring pattern', () => {
    it('returns VIOLATION when no window covers the shift', async () => {
      const { profile, location, skill } = await createBaseContext();
      // 2026-03-24 is a Tuesday
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(StaffAvailability).save({
        staffMemberId: profile.id,
        dayOfWeek: DayOfWeek.MON, // Lacks Tuesday
        wallStartTime: '08:00:00',
        wallEndTime: '20:00:00',
      });

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'AVAILABILITY_WINDOW_MISMATCH' }));
    });

    it('passes when a recurring window fully covers the shift', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(StaffAvailability).save({
        staffMemberId: profile.id,
        dayOfWeek: DayOfWeek.TUE,
        wallStartTime: '08:00:00',
        wallEndTime: '20:00:00',
      });

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.violations.find((v) => v.code === 'AVAILABILITY_WINDOW_MISMATCH')).toBeUndefined();
    });
  });

  describe('no overlap', () => {
    it('returns VIOLATION when overlapping assignment exists', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift: shiftOld, shiftSkill: shiftSkillOld } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      await dataSource.getRepository(Assignment).save({
        staffMemberId: profile.id,
        shiftSkillId: shiftSkillOld.id,
        state: AssignmentState.ASSIGNED,
      });

      // New shift that overlaps
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-24T12:00:00Z'), new Date('2026-03-24T20:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'OVERLAP' }));
    });
  });

  describe('rest gap', () => {
    it('returns VIOLATION when prior shift ends within 10 hours', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift: shiftOld, shiftSkill: shiftSkillOld } = await createShift(location.id, skill.id, new Date('2026-03-24T12:00:00Z'), new Date('2026-03-24T20:00:00Z'));

      await dataSource.getRepository(Assignment).save({
        staffMemberId: profile.id,
        shiftSkillId: shiftSkillOld.id,
        state: AssignmentState.ASSIGNED,
      });

      // New shift starts 2 hours later
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-24T22:00:00Z'), new Date('2026-03-25T06:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'REST_GAP' }));
    });

    it('passes when rest gap is sufficient', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift: shiftOld, shiftSkill: shiftSkillOld } = await createShift(location.id, skill.id, new Date('2026-03-23T12:00:00Z'), new Date('2026-03-23T20:00:00Z'));

      await dataSource.getRepository(Assignment).save({
        staffMemberId: profile.id,
        shiftSkillId: shiftSkillOld.id,
        state: AssignmentState.ASSIGNED,
      });

      // New shift starts 14 hours later
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.violations.find((v) => v.code === 'REST_GAP')).toBeUndefined();
    });
  });

  describe('daily hours', () => {
    it('returns VIOLATION when daily hours exceed 12', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift: shiftOld, shiftSkill: shiftSkillOld } = await createShift(location.id, skill.id, new Date('2026-03-24T06:00:00Z'), new Date('2026-03-24T14:00:00Z')); // 8 hrs

      await dataSource.getRepository(Assignment).save({
        staffMemberId: profile.id,
        shiftSkillId: shiftSkillOld.id,
        state: AssignmentState.ASSIGNED,
      });

      // 6 hour shift pushing total to 14
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-24T16:00:00Z'), new Date('2026-03-24T22:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'DAILY_HOURS_EXCEEDED' }));
    });

    it('returns WARNING when daily hours exceed 8 but not 12', async () => {
      const { profile, location, skill } = await createBaseContext();
      const { shift: shiftOld, shiftSkill: shiftSkillOld } = await createShift(location.id, skill.id, new Date('2026-03-24T08:00:00Z'), new Date('2026-03-24T12:00:00Z')); // 4 hrs

      await dataSource.getRepository(Assignment).save({
        staffMemberId: profile.id,
        shiftSkillId: shiftSkillOld.id,
        state: AssignmentState.ASSIGNED,
      });

      // 6 hour shift pushing total to 10
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-24T14:00:00Z'), new Date('2026-03-24T20:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'DAILY_HOURS_HIGH' }));
    });
  });

  describe('weekly hours', () => {
    it('returns VIOLATION when weekly hours exceed 40', async () => {
      const { profile, location, skill } = await createBaseContext();

      // Assign 5 8-hour shifts taking Monday - Friday
      for (let i = 0; i < 5; i++) {
        const d = 23 + i; // 23 is Monday
        const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date(`2026-03-${d}T00:00:00Z`), new Date(`2026-03-${d}T08:00:00Z`));
        await dataSource.getRepository(Assignment).save({
          staffMemberId: profile.id,
          shiftSkillId: shiftSkill.id,
          state: AssignmentState.ASSIGNED,
        });
      }

      // Add a Saturday shift
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-28T10:00:00Z'), new Date('2026-03-28T18:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'WEEKLY_HOURS_EXCEEDED' }));
    });

    it('returns WARNING when weekly hours approach 40 (35+)', async () => {
      const { profile, location, skill } = await createBaseContext();

      // Assign 4 8-hour shifts = 32 hours
      for (let i = 0; i < 4; i++) {
        const d = 23 + i; // 23 is Monday
        const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date(`2026-03-${d}T00:00:00Z`), new Date(`2026-03-${d}T08:00:00Z`));
        await dataSource.getRepository(Assignment).save({
          staffMemberId: profile.id,
          shiftSkillId: shiftSkill.id,
          state: AssignmentState.ASSIGNED,
        });
      }

      // Add a Friday shift (pushing to 40)
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-27T10:00:00Z'), new Date('2026-03-27T18:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'WEEKLY_HOURS_APPROACHING' }));
    });
  });

  describe('consecutive days', () => {
    it('returns VIOLATION on 7th consecutive day', async () => {
      const { profile, location, skill } = await createBaseContext();

      // Assign 6 2-hour shifts taking Monday - Saturday (To keep hours under 40)
      for (let i = 0; i < 6; i++) {
        const d = 23 + i;
        const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date(`2026-03-${d}T00:00:00Z`), new Date(`2026-03-${d}T02:00:00Z`));
        await dataSource.getRepository(Assignment).save({
          staffMemberId: profile.id,
          shiftSkillId: shiftSkill.id,
          state: AssignmentState.ASSIGNED,
        });
      }

      // Add a Sunday shift
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-29T10:00:00Z'), new Date('2026-03-29T12:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.violations).toContainEqual(expect.objectContaining({ code: 'CONSECUTIVE_DAYS_7' }));
    });

    it('returns WARNING on 6th consecutive day', async () => {
      const { profile, location, skill } = await createBaseContext();

      // Assign 5 2-hour shifts taking Monday - Friday
      for (let i = 0; i < 5; i++) {
        const d = 23 + i;
        const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date(`2026-03-${d}T00:00:00Z`), new Date(`2026-03-${d}T02:00:00Z`));
        await dataSource.getRepository(Assignment).save({
          staffMemberId: profile.id,
          shiftSkillId: shiftSkill.id,
          state: AssignmentState.ASSIGNED,
        });
      }

      // Add a Saturday shift
      const { shift: shiftNew, shiftSkill: shiftSkillNew } = await createShift(location.id, skill.id, new Date('2026-03-28T10:00:00Z'), new Date('2026-03-28T12:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkillNew.id, shiftId: shiftNew.id },
        profile,
        shiftNew.startTime,
        shiftNew.endTime
      );

      expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'CONSECUTIVE_DAYS_6' }));
    });
  });

  describe('full valid assignment', () => {
    it('returns valid=true with no violations', async () => {
      const { profile, location, skill } = await createBaseContext();

      // Fully certify User
      await dataSource.getRepository(StaffSkill).save({ staffMemberId: profile.id, skillId: skill.id });
      await dataSource.getRepository(LocationCertification).save({ staffMemberId: profile.id, locationId: location.id });
      await dataSource.getRepository(StaffAvailability).save({
        staffMemberId: profile.id,
        dayOfWeek: DayOfWeek.TUE, // Tuesday
        wallStartTime: '08:00:00',
        wallEndTime: '20:00:00',
      });

      const { shift, shiftSkill } = await createShift(location.id, skill.id, new Date('2026-03-24T10:00:00Z'), new Date('2026-03-24T18:00:00Z'));

      const result = await service.validate(
        { staffMemberId: profile.id, shiftSkillId: shiftSkill.id, shiftId: shift.id },
        profile,
        shift.startTime,
        shift.endTime
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
