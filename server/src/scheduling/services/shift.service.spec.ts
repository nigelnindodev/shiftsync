import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ShiftService } from './shift.service';
import { ClockService } from '../../common/clock/clock.service';
import {
  ShiftRepository,
  ShiftSkillRepository,
  DomainEventRepository,
} from '../repositories';
import { SkillRepository } from '../../staffing/repositories';
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
import { Assignment } from '../entities/assignment.entity';
import { DomainEvent } from '../entities/domain-event.entity';
import { SCHEDULING_EVENTS_CLIENT } from '../scheduling.constants';
import { SchedulingEventPatterns } from '../events/scheduling-events';

describe('ShiftService (Integration)', () => {
  let module: TestingModule;
  let service: ShiftService;
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
        ShiftService,
        ShiftRepository,
        SkillRepository,
        ShiftSkillRepository,
        DomainEventRepository,
        {
          provide: ClockService,
          useValue: { now: () => new Date() },
        },
        {
          provide: SCHEDULING_EVENTS_CLIENT,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ShiftService>(ShiftService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
  });

  it('should create a shift with skill slots and emit event', async () => {
    const location = await dataSource
      .getRepository(Location)
      .save({ name: 'Loc', timezone: 'UTC', brand: 'Brand' });
    const skill = await dataSource
      .getRepository(Skill)
      .save({ name: 'Skill', isActive: true });

    const shift = await service.createShift(
      location.id,
      '2026-03-24T10:00:00Z',
      '2026-03-24T18:00:00Z',
      [{ skillId: skill.id, headcount: 2 }],
      123, // managerId
    );

    expect(shift.id).toBeDefined();
    expect(shift.state).toBe(ShiftState.OPEN);
    expect(shift.skills).toHaveLength(1);
    expect(shift.skills[0].skillId).toBe(skill.id);
    expect(shift.skills[0].headcount).toBe(2);

    // Verify event persistence
    const events = await dataSource.getRepository(DomainEvent).find();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe(SchedulingEventPatterns.SHIFT_CREATED);
    expect(events[0].aggregateId).toBe(shift.id);
  });

  it('should reject shift if skill is inactive', async () => {
    const location = await dataSource
      .getRepository(Location)
      .save({ name: 'Loc', timezone: 'UTC', brand: 'Brand' });
    const skill = await dataSource
      .getRepository(Skill)
      .save({ name: 'Old Skill', isActive: false });

    await expect(
      service.createShift(
        location.id,
        '2026-03-24T10:00:00Z',
        '2026-03-24T18:00:00Z',
        [{ skillId: skill.id, headcount: 1 }],
      ),
    ).rejects.toThrow('is deprecated');
  });

  it('should cancel an open shift', async () => {
    const location = await dataSource
      .getRepository(Location)
      .save({ name: 'Loc', timezone: 'UTC', brand: 'Brand' });
    const skill = await dataSource
      .getRepository(Skill)
      .save({ name: 'Skill', isActive: true });

    const shift = await service.createShift(
      location.id,
      '2026-03-24T10:00:00Z',
      '2026-03-24T18:00:00Z',
      [{ skillId: skill.id, headcount: 1 }],
    );

    await service.cancelShift(shift.id, 123);

    const updatedShift = await dataSource
      .getRepository(Shift)
      .findOneBy({ id: shift.id });
    expect(updatedShift?.state).toBe(ShiftState.CANCELLED);

    const events = await dataSource.getRepository(DomainEvent).find({
      where: { eventType: SchedulingEventPatterns.SHIFT_CANCELLED },
    });
    expect(events).toHaveLength(1);
  });
});
