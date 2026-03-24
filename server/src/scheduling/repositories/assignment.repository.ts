import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Assignment, AssignmentState } from '../entities/assignment.entity';
import { ShiftSkill } from '../entities/shift-skill.entity';
import { Shift } from '../entities/shift.entity';
import { Result } from 'true-myth';

export const ACTIVE_STATES: AssignmentState[] = [
  AssignmentState.ASSIGNED,
  AssignmentState.SWAP_REQUESTED,
  AssignmentState.SWAP_PENDING_APPROVAL,
  AssignmentState.DROP_PENDING_APPROVAL,
];

const PENDING_SWAP_DROP_STATES: AssignmentState[] = [
  AssignmentState.SWAP_REQUESTED,
  AssignmentState.SWAP_PENDING_APPROVAL,
  AssignmentState.DROP_REQUESTED,
  AssignmentState.DROP_PENDING_APPROVAL,
];

@Injectable()
export class AssignmentRepository {
  private readonly logger = new Logger(AssignmentRepository.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly repo: Repository<Assignment>,
    @InjectRepository(ShiftSkill)
    private readonly shiftSkillRepo: Repository<ShiftSkill>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: number): Promise<Assignment | null> {
    return this.repo.findOneBy({ id });
  }

  async findByIdWithRelations(id: number): Promise<Assignment | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['shiftSkill', 'shiftSkill.shift'],
    });
  }

  async findByShiftSkillId(shiftSkillId: number): Promise<Assignment[]> {
    return this.repo.find({
      where: { shiftSkillId },
      relations: ['staffMember', 'staffMember.user'],
    });
  }

  async findAssignedByShiftSkillId(
    shiftSkillId: number,
  ): Promise<Assignment[]> {
    return this.repo.find({
      where: { shiftSkillId, state: AssignmentState.ASSIGNED },
    });
  }

  async countPendingRequests(staffMemberId: number): Promise<number> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.staff_member_id = :staffMemberId', { staffMemberId })
      .andWhere('a.state IN (:...states)', {
        states: PENDING_SWAP_DROP_STATES,
      })
      .getCount();
  }

  async findPendingForShift(shiftId: number): Promise<Assignment[]> {
    return this.repo
      .createQueryBuilder('a')
      .innerJoin('a.shiftSkill', 'ss')
      .where('ss.shift_id = :shiftId', { shiftId })
      .andWhere('a.state IN (:...states)', {
        states: PENDING_SWAP_DROP_STATES,
      })
      .getMany();
  }

  async findOverlappingAssignments(
    staffMemberId: number,
    shiftStartTime: Date,
    shiftEndTime: Date,
  ): Promise<Assignment[]> {
    return this.repo
      .createQueryBuilder('a')
      .innerJoin('a.shiftSkill', 'ss')
      .innerJoin('ss.shift', 's')
      .where('a.staff_member_id = :staffMemberId', { staffMemberId })
      .andWhere('a.state IN (:...states)', { states: ACTIVE_STATES })
      .andWhere('s.start_time < :shiftEndTime', { shiftEndTime })
      .andWhere('s.end_time > :shiftStartTime', { shiftStartTime })
      .getMany();
  }

  async createWithLock(
    shiftSkillId: number,
    staffMemberId: number,
    assignedByManagerId: number | undefined,
    recurringAssignmentId: number | undefined,
  ): Promise<Result<Assignment, Error>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const shiftSkill = await queryRunner.manager.findOne(ShiftSkill, {
        where: { id: shiftSkillId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shiftSkill) {
        await queryRunner.rollbackTransaction();
        return Result.err(new Error(`ShiftSkill ${shiftSkillId} not found`));
      }

      const shift = await queryRunner.manager.findOne(Shift, {
        where: { id: shiftSkill.shiftId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shift) {
        await queryRunner.rollbackTransaction();
        return Result.err(new Error(`Shift ${shiftSkill.shiftId} not found`));
      }

      const assignmentCount = await queryRunner.manager.count(Assignment, {
        where: { shiftSkillId, state: AssignmentState.ASSIGNED },
      });

      if (assignmentCount >= shiftSkill.headcount) {
        await queryRunner.rollbackTransaction();
        return Result.err(new Error(`Shift skill headcount reached`));
      }

      await queryRunner.manager.query(
        `SELECT pg_advisory_xact_lock('assignments'::regclass::integer, $1)`,
        [staffMemberId],
      );

      const stateList = ACTIVE_STATES.map((s) => `'${s}'`).join(', ');
      const conflicts: { id: number }[] = await queryRunner.manager.query(
        `
        SELECT assignments.id
        FROM assignments
        JOIN shift_skills ss ON ss.id = assignments.shift_skill_id
        JOIN shifts s ON s.id = ss.shift_id
        WHERE assignments.staff_member_id = $1
          AND assignments.state IN (${stateList})
          AND s.start_time < $2
          AND s.end_time > $3
        FOR UPDATE
        `,
        [staffMemberId, shift.endTime, shift.startTime],
      );

      if (conflicts.length > 0) {
        await queryRunner.rollbackTransaction();
        return Result.err(
          new Error(
            `Staff member ${staffMemberId} already has an overlapping assignment`,
          ),
        );
      }

      const assignment = queryRunner.manager.create(Assignment, {
        shiftSkillId,
        staffMemberId,
        assignedByManagerId,
        recurringAssignmentId,
        state: AssignmentState.ASSIGNED,
      });
      const saved = await queryRunner.manager.save(assignment);
      await queryRunner.commitTransaction();
      return Result.ok(saved);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to create assignment for staff ${staffMemberId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to create assignment'),
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateState(
    id: number,
    state: AssignmentState,
  ): Promise<Result<void, Error>> {
    try {
      const res = await this.repo.update(id, { state });
      if (res.affected === 0) {
        return Result.err(
          new Error(`Assignment ${id} not found or state unchanged`),
        );
      }
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to update assignment ${id} state`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to update assignment state'),
      );
    }
  }

  async updateStateWithSwapTarget(
    id: number,
    state: AssignmentState,
    swapTargetId: number | null,
  ): Promise<Result<void, Error>> {
    try {
      const updateData: Record<string, unknown> = { state };
      updateData['swapTargetId'] = swapTargetId;
      const res = await this.repo.update(id, updateData);
      if (res.affected === 0) {
        return Result.err(
          new Error(`Assignment ${id} not found or state unchanged`),
        );
      }
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to update assignment ${id}`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to update assignment'),
      );
    }
  }

  async cancelPendingForShift(shiftId: number): Promise<Result<void, Error>> {
    try {
      await this.repo
        .createQueryBuilder()
        .update(Assignment)
        .set({ state: AssignmentState.CANCELLED })
        .where(
          `shift_skill_id IN (SELECT id FROM shift_skills WHERE shift_id = :shiftId)`,
          { shiftId },
        )
        .andWhere('state IN (:...states)', {
          states: PENDING_SWAP_DROP_STATES,
        })
        .execute();
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(
        `Failed to cancel pending assignments for shift ${shiftId}`,
        e,
      );
      return Result.err(
        e instanceof Error
          ? e
          : new Error('Failed to cancel pending assignments'),
      );
    }
  }

  async findByStaffMemberAndDateRange(
    staffMemberId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<Assignment[]> {
    return this.repo
      .createQueryBuilder('a')
      .innerJoin('a.shiftSkill', 'ss')
      .innerJoin('ss.shift', 's')
      .where('a.staff_member_id = :staffMemberId', { staffMemberId })
      .andWhere('a.state = :state', { state: AssignmentState.ASSIGNED })
      .andWhere('s.start_time >= :fromDate', { fromDate })
      .andWhere('s.start_time <= :toDate', { toDate })
      .getMany();
  }

  async sumHoursByStaffMemberInWeek(
    staffMemberId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('a')
      .innerJoin('a.shiftSkill', 'ss')
      .innerJoin('ss.shift', 's')
      .select(
        'SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600)',
        'totalHours',
      )
      .where('a.staff_member_id = :staffMemberId', { staffMemberId })
      .andWhere('a.state = :state', { state: AssignmentState.ASSIGNED })
      .andWhere('s.start_time >= :fromDate', { fromDate })
      .andWhere('s.start_time <= :toDate', { toDate })
      .getRawOne<{ totalHours: string }>();

    return result?.totalHours ? parseFloat(result.totalHours) : 0;
  }

  async findByStaffMemberAndDateRangeWithDetails(
    staffMemberId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<
      Assignment & {
        shiftSkill: ShiftSkill & {
          shift: Shift & {
            location: { id: number; name: string; timezone: string };
          };
          skill: { id: number; name: string };
        };
      }
    >
  > {
    return this.repo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.shiftSkill', 'ss')
      .innerJoinAndSelect('ss.shift', 's')
      .innerJoinAndSelect('ss.skill', 'sk')
      .innerJoinAndSelect('s.location', 'l')
      .where('a.staff_member_id = :staffMemberId', { staffMemberId })
      .andWhere('s.start_time <= :endDate', { endDate })
      .andWhere('s.end_time >= :startDate', { startDate })
      .andWhere('a.state NOT IN (:...excludedStates)', {
        excludedStates: [
          AssignmentState.CANCELLED,
          AssignmentState.NO_SHOW,
          AssignmentState.COMPLETED,
        ],
      })
      .orderBy('s.start_time', 'ASC')
      .getMany() as Promise<
      Array<
        Assignment & {
          shiftSkill: ShiftSkill & {
            shift: Shift & {
              location: { id: number; name: string; timezone: string };
            };
            skill: { id: number; name: string };
          };
        }
      >
    >;
  }
}
