import { Test, TestingModule } from '@nestjs/testing';
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
import { UserProfile } from '../../users/entity/profile.entity';
import { UserRole } from '../../users/user.types';
import { ShiftState } from '../entities/shift.entity';

const defaultShift = {
  id: 10,
  locationId: 1,
  startTime: new Date('2026-03-23T10:00:00Z'),
  endTime: new Date('2026-03-23T18:00:00Z'),
  state: ShiftState.OPEN,
};

function makeStaff(): UserProfile {
  return {
    id: 1,
    externalId: 'ext-1',
    user: { id: 1 } as never,
    role: UserRole.STAFF,
    homeTimezone: 'America/New_York',
    desiredHoursPerWeek: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeMocks(overrides: Record<string, unknown> = {}) {
  const base = {
    mockStaffSkillRepo: { hasSkill: jest.fn().mockResolvedValue(true) },
    mockLocationCertRepo: { isCertified: jest.fn().mockResolvedValue(true) },
    mockAvailabilityRepo: {
      findByStaffMember: jest
        .fn()
        .mockResolvedValue([
          { dayOfWeek: 'MON', wallStartTime: '05:00', wallEndTime: '14:00' },
        ]),
      findExceptionsForDate: jest.fn().mockResolvedValue([]),
    },
    mockAssignmentRepo: {
      findOverlappingAssignments: jest.fn().mockResolvedValue([]),
      findByStaffMemberAndDateRange: jest.fn().mockResolvedValue([]),
    },
    mockShiftRepo: {
      findById: jest
        .fn()
        .mockResolvedValue({ isJust: true, value: defaultShift }),
    },
    mockShiftSkillRepo: {
      findByIdWithShift: jest.fn().mockResolvedValue(null),
    },
    mockDataSource: { query: jest.fn().mockResolvedValue([]) },
    mockClockService: { now: jest.fn() },
  };

  for (const [key, val] of Object.entries(overrides)) {
    if (val && typeof val === 'object') {
      Object.assign((base as Record<string, unknown>)[key] as object, val);
    }
  }

  return base;
}

async function validate(overrides: Record<string, unknown> = {}) {
  const mocks = makeMocks(overrides);

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SchedulingConstraintService,
      { provide: ClockService, useValue: mocks.mockClockService },
      { provide: StaffSkillRepository, useValue: mocks.mockStaffSkillRepo },
      {
        provide: LocationCertificationRepository,
        useValue: mocks.mockLocationCertRepo,
      },
      {
        provide: StaffAvailabilityRepository,
        useValue: mocks.mockAvailabilityRepo,
      },
      { provide: AssignmentRepository, useValue: mocks.mockAssignmentRepo },
      { provide: ShiftRepository, useValue: mocks.mockShiftRepo },
      { provide: ShiftSkillRepository, useValue: mocks.mockShiftSkillRepo },
      { provide: DataSource, useValue: mocks.mockDataSource },
    ],
  }).compile();

  const service = module.get<SchedulingConstraintService>(
    SchedulingConstraintService,
  );
  return service.validate(
    { staffMemberId: 1, shiftSkillId: 5, shiftId: 10 },
    makeStaff(),
    new Date('2026-03-23T10:00:00Z'),
    new Date('2026-03-23T18:00:00Z'),
  );
}

describe('SchedulingConstraintService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('skill match', () => {
    it('returns VIOLATION when staff lacks required skill', async () => {
      const result = await validate({
        mockStaffSkillRepo: { hasSkill: jest.fn().mockResolvedValue(false) },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'SKILL_MISMATCH' }),
      );
    });

    it('passes when staff has the required skill', async () => {
      const result = await validate();
      expect(
        result.violations.find((v) => v.code === 'SKILL_MISMATCH'),
      ).toBeUndefined();
    });
  });

  describe('location certification', () => {
    it('returns VIOLATION when staff is not certified', async () => {
      const result = await validate({
        mockLocationCertRepo: {
          isCertified: jest.fn().mockResolvedValue(false),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'NOT_CERTIFIED' }),
      );
    });

    it('passes when staff is certified', async () => {
      const result = await validate();
      expect(
        result.violations.find((v) => v.code === 'NOT_CERTIFIED'),
      ).toBeUndefined();
    });
  });

  describe('availability — blocking exception', () => {
    it('returns VIOLATION when staff has blocked the date', async () => {
      const result = await validate({
        mockAvailabilityRepo: {
          findExceptionsForDate: jest
            .fn()
            .mockResolvedValue([{ isAvailable: false }]),
          findByStaffMember: jest.fn().mockResolvedValue([]),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'UNAVAILABLE' }),
      );
    });
  });

  describe('availability — override window', () => {
    it('returns VIOLATION when shift falls outside override window', async () => {
      const result = await validate({
        mockAvailabilityRepo: {
          findExceptionsForDate: jest.fn().mockResolvedValue([
            {
              isAvailable: true,
              wallStartTime: '20:00',
              wallEndTime: '23:00',
            },
          ]),
          findByStaffMember: jest.fn().mockResolvedValue([]),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'AVAILABILITY_WINDOW_MISMATCH' }),
      );
    });

    it('passes when shift falls within override window', async () => {
      const result = await validate({
        mockAvailabilityRepo: {
          findExceptionsForDate: jest.fn().mockResolvedValue([
            {
              isAvailable: true,
              wallStartTime: '05:00',
              wallEndTime: '14:00',
            },
          ]),
          findByStaffMember: jest.fn().mockResolvedValue([]),
        },
      });
      expect(
        result.violations.find(
          (v) => v.code === 'AVAILABILITY_WINDOW_MISMATCH',
        ),
      ).toBeUndefined();
    });
  });

  describe('availability — recurring pattern', () => {
    it('returns VIOLATION when no window covers the shift', async () => {
      const result = await validate({
        mockAvailabilityRepo: {
          findExceptionsForDate: jest.fn().mockResolvedValue([]),
          findByStaffMember: jest.fn().mockResolvedValue([
            {
              dayOfWeek: 'MON',
              wallStartTime: '09:00',
              wallEndTime: '12:00',
            },
          ]),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'AVAILABILITY_WINDOW_MISMATCH' }),
      );
    });

    it('passes when a recurring window fully covers the shift', async () => {
      const result = await validate({
        mockAvailabilityRepo: {
          findExceptionsForDate: jest.fn().mockResolvedValue([]),
          findByStaffMember: jest.fn().mockResolvedValue([
            {
              dayOfWeek: 'MON',
              wallStartTime: '05:00',
              wallEndTime: '14:00',
            },
          ]),
        },
      });
      expect(
        result.violations.find(
          (v) => v.code === 'AVAILABILITY_WINDOW_MISMATCH',
        ),
      ).toBeUndefined();
    });
  });

  describe('no overlap', () => {
    it('returns VIOLATION when overlapping assignment exists', async () => {
      const result = await validate({
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([{ id: 99 }]),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'OVERLAP' }),
      );
    });
  });

  describe('rest gap', () => {
    it('returns VIOLATION when prior shift ends within 10 hours', async () => {
      const result = await validate({
        mockDataSource: {
          query: jest
            .fn()
            .mockResolvedValue([
              { priorShiftEnd: new Date('2026-03-23T02:00:00Z') },
            ]),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'REST_GAP' }),
      );
    });

    it('passes when rest gap is sufficient', async () => {
      const result = await validate({
        mockDataSource: {
          query: jest
            .fn()
            .mockResolvedValue([
              { priorShiftEnd: new Date('2026-03-22T22:00:00Z') },
            ]),
        },
      });
      expect(
        result.violations.find((v) => v.code === 'REST_GAP'),
      ).toBeUndefined();
    });
  });

  describe('daily hours', () => {
    it('returns VIOLATION when daily hours exceed 12', async () => {
      const result = await validate({
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([]),
          findByStaffMemberAndDateRange: jest
            .fn()
            .mockResolvedValue([{ shiftSkillId: 3 }]),
        },
        mockShiftSkillRepo: {
          findByIdWithShift: jest.fn().mockResolvedValue({
            shift: {
              startTime: new Date('2026-03-23T06:00:00Z'),
              endTime: new Date('2026-03-23T14:00:00Z'),
            },
          }),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'DAILY_HOURS_EXCEEDED' }),
      );
    });

    it('returns WARNING when daily hours exceed 8 but not 12', async () => {
      const result = await validate({
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([]),
          findByStaffMemberAndDateRange: jest
            .fn()
            .mockResolvedValue([{ shiftSkillId: 3 }]),
        },
        mockShiftSkillRepo: {
          findByIdWithShift: jest.fn().mockResolvedValue({
            shift: {
              startTime: new Date('2026-03-23T10:00:00Z'),
              endTime: new Date('2026-03-23T14:00:00Z'),
            },
          }),
        },
      });
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'DAILY_HOURS_HIGH' }),
      );
    });
  });

  describe('weekly hours', () => {
    it('returns VIOLATION when weekly hours exceed 40', async () => {
      const manyAssignments = Array(11)
        .fill(null)
        .map((_, i) => ({ shiftSkillId: i }));
      const mockFindByDateRange = jest.fn();
      mockFindByDateRange
        .mockResolvedValueOnce([]) // daily check — no existing assignments
        .mockResolvedValueOnce(manyAssignments) // weekly check — many existing assignments
        .mockResolvedValueOnce([]); // consecutive days check (not relevant for this test)
      const result = await validate({
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([]),
          findByStaffMemberAndDateRange: mockFindByDateRange,
        },
        mockShiftSkillRepo: {
          findByIdWithShift: jest.fn().mockResolvedValue({
            shift: {
              startTime: new Date('2026-03-20T14:00:00Z'),
              endTime: new Date('2026-03-20T18:00:00Z'),
            },
          }),
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'WEEKLY_HOURS_EXCEEDED' }),
      );
    });

    it('returns WARNING when weekly hours approach 40 (35+)', async () => {
      const someAssignments = Array(8)
        .fill(null)
        .map((_, i) => ({ shiftSkillId: i }));
      const mockFindByDateRange = jest.fn();
      mockFindByDateRange
        .mockResolvedValueOnce([]) // daily check
        .mockResolvedValueOnce(someAssignments) // weekly check
        .mockResolvedValueOnce([]); // consecutive days check (not relevant for this test)
      const result = await validate({
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([]),
          findByStaffMemberAndDateRange: mockFindByDateRange,
        },
        mockShiftSkillRepo: {
          findByIdWithShift: jest.fn().mockResolvedValue({
            shift: {
              startTime: new Date('2026-03-20T14:00:00Z'),
              endTime: new Date('2026-03-20T18:00:00Z'),
            },
          }),
        },
      });
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'WEEKLY_HOURS_APPROACHING' }),
      );
    });
  });

  describe('consecutive days', () => {
    it('returns VIOLATION on 7th consecutive day', async () => {
      const sevenAssignments = Array(7)
        .fill(null)
        .map((_, i) => ({ shiftSkillId: i }));
      const mockFindByDateRange = jest.fn();
      mockFindByDateRange
        .mockResolvedValueOnce([]) // daily check
        .mockResolvedValueOnce([]) // weekly hours check (no existing)
        .mockResolvedValueOnce(sevenAssignments); // consecutive days check
      const mockFindByIdWithShift = jest
        .fn()
        .mockImplementation((id: number) => {
          const baseDate = new Date('2026-03-22T14:00:00Z');
          baseDate.setDate(baseDate.getDate() - (6 - id));
          return Promise.resolve({
            shift: {
              startTime: baseDate,
              endTime: new Date(baseDate.getTime() + 60 * 60 * 1000),
            },
          });
        });
      const result = await validate({
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([]),
          findByStaffMemberAndDateRange: mockFindByDateRange,
        },
        mockShiftSkillRepo: {
          findByIdWithShift: mockFindByIdWithShift,
        },
      });
      expect(result.violations).toContainEqual(
        expect.objectContaining({ code: 'CONSECUTIVE_DAYS_7' }),
      );
    });

    it('returns WARNING on 6th consecutive day', async () => {
      const sixAssignments = Array(5)
        .fill(null)
        .map((_, i) => ({ shiftSkillId: i }));
      const mockFindByDateRange = jest.fn();
      mockFindByDateRange
        .mockResolvedValueOnce([]) // daily check
        .mockResolvedValueOnce([]) // weekly hours check (no existing)
        .mockResolvedValueOnce(sixAssignments); // consecutive days check
      const mockFindByIdWithShift = jest
        .fn()
        .mockImplementation((id: number) => {
          const baseDate = new Date('2026-03-22T14:00:00Z');
          baseDate.setDate(baseDate.getDate() - (4 - id));
          return Promise.resolve({
            shift: {
              startTime: baseDate,
              endTime: new Date(baseDate.getTime() + 60 * 60 * 1000),
            },
          });
        });
      const result = await validate({
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([]),
          findByStaffMemberAndDateRange: mockFindByDateRange,
        },
        mockShiftSkillRepo: {
          findByIdWithShift: mockFindByIdWithShift,
        },
      });
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'CONSECUTIVE_DAYS_6' }),
      );
    });
  });

  describe('full valid assignment', () => {
    it('returns valid=true with no violations', async () => {
      const result = await validate({
        mockAvailabilityRepo: {
          findExceptionsForDate: jest.fn().mockResolvedValue([]),
          findByStaffMember: jest.fn().mockResolvedValue([
            {
              dayOfWeek: 'MON',
              wallStartTime: '05:00',
              wallEndTime: '14:00',
            },
          ]),
        },
        mockAssignmentRepo: {
          findOverlappingAssignments: jest.fn().mockResolvedValue([]),
          findByStaffMemberAndDateRange: jest.fn().mockResolvedValue([]),
        },
        mockDataSource: {
          query: jest.fn().mockResolvedValue([]),
        },
        mockShiftSkillRepo: {
          findByIdWithShift: jest.fn().mockResolvedValue(null),
        },
      });
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
