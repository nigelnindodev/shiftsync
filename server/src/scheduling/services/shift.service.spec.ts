import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ShiftService } from './shift.service';
import { ShiftRepository } from '../repositories';
import { ShiftSkillRepository } from '../repositories';
import { DomainEventRepository } from '../repositories';
import { SkillRepository } from '../../staffing/repositories';
import { clearDatabase } from '../../../test/db-utils';

import { User } from '../../users/entity/user.entity';
import { Employee } from '../../users/entity/employee.entity';
import { Token } from '../../auth/entity/tokens.entity';
import { Location } from '../../staffing/entities/location.entity';
import { Skill } from '../../staffing/entities/skill.entity';
import { Shift, ShiftState } from '../entities/shift.entity';
import { ShiftSkill } from '../entities/shift-skill.entity';
import { DomainEvent } from '../entities/domain-event.entity';
import { SchedulingEventPatterns } from '../events/scheduling-events';
import { SCHEDULING_EVENTS_CLIENT } from '../scheduling.constants';

describe('ShiftService (Integration)', () => {
  let module: TestingModule;
  let shiftService: ShiftService;
  let dataSource: DataSource;
  let emitMock: jest.Mock;

  beforeAll(async () => {
    emitMock = jest.fn();
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
          Shift,
          ShiftSkill,
          DomainEvent,
        ]),
      ],
      providers: [
        ShiftService,
        ShiftRepository,
        ShiftSkillRepository,
        DomainEventRepository,
        SkillRepository,
        {
          provide: SCHEDULING_EVENTS_CLIENT,
          useValue: { emit: emitMock },
        },
      ],
    }).compile();

    shiftService = module.get<ShiftService>(ShiftService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
    emitMock.mockClear();
  });

  async function createLocation() {
    return dataSource.getRepository(Location).save({
      name: 'Test Location',
      timezone: 'UTC',
      brand: 'Brand',
    });
  }

  async function createSkill(active = true) {
    return dataSource.getRepository(Skill).save({
      name: 'Test Skill',
      isActive: active,
    });
  }

  describe('createShift', () => {
    it('creates shift with OPEN state and emits ShiftCreated event', async () => {
      const location = await createLocation();
      const skill = await createSkill();

      const result = await shiftService.createShift(
        location.id,
        '2026-03-24T10:00:00Z',
        '2026-03-24T18:00:00Z',
        [{ skillId: skill.id, headcount: 2 }],
      );

      expect(result.id).toBeDefined();
      expect(result.state).toBe(ShiftState.OPEN);
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].headcount).toBe(2);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: result.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(SchedulingEventPatterns.SHIFT_CREATED);

      expect(emitMock).toHaveBeenCalledWith(
        SchedulingEventPatterns.SHIFT_CREATED,
        expect.objectContaining({
          shiftId: result.id,
          locationId: location.id,
          startTime: '2026-03-24T10:00:00Z',
          endTime: '2026-03-24T18:00:00Z',
          eventId: events[0].id,
        }),
      );
    });

    it('rejects shift with deprecated skill', async () => {
      const location = await createLocation();
      const skill = await createSkill(false);

      await expect(
        shiftService.createShift(
          location.id,
          '2026-03-24T10:00:00Z',
          '2026-03-24T18:00:00Z',
          [{ skillId: skill.id, headcount: 1 }],
        ),
      ).rejects.toThrow('deprecated');
    });

    it('rejects shift when startTime >= endTime', async () => {
      const location = await createLocation();
      const skill = await createSkill();

      await expect(
        shiftService.createShift(
          location.id,
          '2026-03-24T18:00:00Z',
          '2026-03-24T10:00:00Z',
          [{ skillId: skill.id, headcount: 1 }],
        ),
      ).rejects.toThrow('startTime must be before endTime');
    });

    it('rejects shift with no skills', async () => {
      const location = await createLocation();

      await expect(
        shiftService.createShift(
          location.id,
          '2026-03-24T10:00:00Z',
          '2026-03-24T18:00:00Z',
          [],
        ),
      ).rejects.toThrow('At least one skill slot is required');
    });
  });

  describe('cancelShift', () => {
    it('cancels shift and emits ShiftCancelled event', async () => {
      const location = await createLocation();
      const skill = await createSkill();

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.OPEN,
      });
      await dataSource.getRepository(ShiftSkill).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 1,
      });

      await shiftService.cancelShift(shift.id);

      const updated = await dataSource.getRepository(Shift).findOneBy({
        id: shift.id,
      });
      expect(updated?.state).toBe(ShiftState.CANCELLED);

      const events = await dataSource.getRepository(DomainEvent).find({
        where: { aggregateId: shift.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe(SchedulingEventPatterns.SHIFT_CANCELLED);

      expect(emitMock).toHaveBeenCalledWith(
        SchedulingEventPatterns.SHIFT_CANCELLED,
        expect.objectContaining({
          shiftId: shift.id,
          eventId: events[0].id,
        }),
      );
    });

    it('rejects cancel for already cancelled shift', async () => {
      const location = await createLocation();
      const skill = await createSkill();

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.CANCELLED,
      });
      await dataSource.getRepository(ShiftSkill).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 1,
      });

      await expect(shiftService.cancelShift(shift.id)).rejects.toThrow(
        'Cannot cancel shift in state CANCELLED',
      );
    });

    it('rejects cancel for completed shift', async () => {
      const location = await createLocation();
      const skill = await createSkill();

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.COMPLETED,
      });
      await dataSource.getRepository(ShiftSkill).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 1,
      });

      await expect(shiftService.cancelShift(shift.id)).rejects.toThrow(
        'Cannot cancel shift in state COMPLETED',
      );
    });
  });

  describe('getShiftSkillSlots', () => {
    it('returns shift with skill slots', async () => {
      const location = await createLocation();
      const skill = await createSkill();

      const shift = await dataSource.getRepository(Shift).save({
        locationId: location.id,
        startTime: new Date('2026-03-24T10:00:00Z'),
        endTime: new Date('2026-03-24T18:00:00Z'),
        state: ShiftState.OPEN,
      });
      await dataSource.getRepository(ShiftSkill).save({
        shiftId: shift.id,
        skillId: skill.id,
        headcount: 3,
      });

      const result = await shiftService.getShiftSkillSlots(shift.id);

      expect(result.id).toBe(shift.id);
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].headcount).toBe(3);
    });

    it('throws NotFoundException for non-existent shift', async () => {
      await expect(shiftService.getShiftSkillSlots(99999)).rejects.toThrow(
        'Shift 99999 not found',
      );
    });
  });
});
