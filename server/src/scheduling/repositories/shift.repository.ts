import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Shift, ShiftState } from '../entities/shift.entity';
import { ShiftSkill } from '../entities/shift-skill.entity';
import { Maybe, Result } from 'true-myth';

export interface ShiftSkillWithFill {
  id: number;
  skillId: number;
  skillName: string;
  headcount: number;
  assignedCount: number;
}

export interface ShiftWithSkillSlots {
  id: number;
  templateId?: number;
  scheduleId?: number;
  locationId: number;
  startTime: Date;
  endTime: Date;
  state: ShiftState;
  skills: ShiftSkillWithFill[];
}

@Injectable()
export class ShiftRepository {
  private readonly logger = new Logger(ShiftRepository.name);

  constructor(
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    @InjectRepository(ShiftSkill)
    private readonly skillRepo: Repository<ShiftSkill>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<Maybe<Shift>> {
    return Maybe.of(await this.shiftRepo.findOneBy({ id }));
  }

  async findByIdWithSkillSlots(
    id: number,
  ): Promise<Maybe<ShiftWithSkillSlots>> {
    const shift = await this.shiftRepo.findOneBy({ id });
    if (!shift) return Maybe.nothing();

    const skills = await this.getSkillSlotsWithFillState(id);
    return Maybe.of({ ...shift, skills });
  }

  async create(
    data: Omit<Shift, 'id' | 'createdAt' | 'updatedAt' | 'skills' | 'location'>,
    skillSlots: Array<{ skillId: number; headcount: number }>,
  ): Promise<Result<ShiftWithSkillSlots, Error>> {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const shift = manager.create(Shift, data as Shift);
        const savedShift = await manager.save(shift);

        const createdSlots: ShiftSkillWithFill[] = [];
        for (const slot of skillSlots) {
          const skillEntity = manager.create(ShiftSkill, {
            shiftId: savedShift.id,
            skillId: slot.skillId,
            headcount: slot.headcount,
          });
          const savedSlot = await manager.save(skillEntity);
          createdSlots.push({
            id: savedSlot.id,
            skillId: savedSlot.skillId,
            skillName: '',
            headcount: savedSlot.headcount,
            assignedCount: 0,
          });
        }

        return { ...savedShift, skills: createdSlots };
      });
      return Result.ok(result);
    } catch (e) {
      this.logger.error(`Failed to create shift`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to create shift'),
      );
    }
  }

  async getSkillSlotsWithFillState(
    shiftId: number,
  ): Promise<ShiftSkillWithFill[]> {
    const results: unknown = await this.shiftRepo.manager.query(
      `
      SELECT
        ss.id,
        ss.skill_id AS "skillId",
        sk.name AS "skillName",
        ss.headcount,
        COUNT(a.id) AS "assignedCount"
      FROM shift_skills ss
      JOIN skills sk ON sk.id = ss.skill_id
      LEFT JOIN assignments a ON a.shift_skill_id = ss.id
        AND a.state = 'ASSIGNED'
      WHERE ss.shift_id = $1
      GROUP BY ss.id, ss.skill_id, sk.name, ss.headcount
      `,
      [shiftId],
    );
    const rows = results as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: r.id as number,
      skillId: r.skillId as number,
      skillName: r.skillName as string,
      headcount: r.headcount as number,
      assignedCount: parseInt(r.assignedCount as string, 10),
    }));
  }

  async deriveFillState(shiftId: number): Promise<ShiftState> {
    const slots = await this.getSkillSlotsWithFillState(shiftId);
    const allEmpty = slots.every((s) => s.assignedCount === 0);
    if (allEmpty) return ShiftState.OPEN;

    const allFull = slots.every((s) => s.assignedCount >= s.headcount);
    if (allFull) return ShiftState.FILLED;

    return ShiftState.PARTIALLY_FILLED;
  }

  async updateState(
    id: number,
    state: ShiftState,
  ): Promise<Result<void, Error>> {
    try {
      await this.shiftRepo.update(id, { state });
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to update shift ${id} state`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to update shift state'),
      );
    }
  }

  async findByLocationAndDateRange(
    locationId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<Shift[]> {
    return this.shiftRepo
      .createQueryBuilder('s')
      .where('s.location_id = :locationId', { locationId })
      .andWhere('s.start_time >= :fromDate', { fromDate })
      .andWhere('s.start_time <= :toDate', { toDate })
      .andWhere('s.state NOT IN (:...states)', {
        states: [ShiftState.CANCELLED, ShiftState.COMPLETED],
      })
      .orderBy('s.start_time', 'ASC')
      .getMany();
  }
}
