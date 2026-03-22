import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Assignment, AssignmentState } from '../entities/assignment.entity';
import { ShiftSkill } from '../entities/shift-skill.entity';
import { Result } from 'true-myth';

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

  async findByShiftSkillId(shiftSkillId: number): Promise<Assignment[]> {
    return this.repo.find({
      where: { shiftSkillId },
      relations: ['shiftSkill'],
    });
  }

  async findAssignedByShiftSkillId(
    shiftSkillId: number,
  ): Promise<Assignment[]> {
    return this.repo.find({
      where: { shiftSkillId, state: AssignmentState.ASSIGNED },
    });
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
      .andWhere('a.state IN (:...states)', {
        states: [
          AssignmentState.ASSIGNED,
          AssignmentState.SWAP_REQUESTED,
          AssignmentState.SWAP_PENDING_APPROVAL,
        ],
      })
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
        relations: ['shift'],
      });
      if (!shiftSkill) {
        await queryRunner.rollbackTransaction();
        return Result.err(new Error(`ShiftSkill ${shiftSkillId} not found`));
      }

      await queryRunner.manager.query(
        `
        SELECT assignments.id
        FROM assignments
        JOIN shift_skills ss ON ss.id = assignments.shift_skill_id
        JOIN shifts s ON s.id = ss.shift_id
        WHERE assignments.staff_member_id = $1
          AND assignments.state = 'ASSIGNED'
          AND s.start_time < $2
          AND s.end_time > $3
        FOR UPDATE
        `,
        [staffMemberId, shiftSkill.shift!.endTime, shiftSkill.shift!.startTime],
      );

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
      await this.repo.update(id, { state });
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to update assignment ${id} state`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to update assignment state'),
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
          states: [
            AssignmentState.SWAP_REQUESTED,
            AssignmentState.SWAP_PENDING_APPROVAL,
          ],
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
}
