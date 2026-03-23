import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringAssignment } from '../entities/recurring-assignment.entity';
import { Result } from 'true-myth';

@Injectable()
export class RecurringAssignmentRepository {
  private readonly logger = new Logger(RecurringAssignmentRepository.name);

  constructor(
    @InjectRepository(RecurringAssignment)
    private readonly repo: Repository<RecurringAssignment>,
  ) {}

  async findById(id: number): Promise<RecurringAssignment | null> {
    return this.repo.findOneBy({ id });
  }

  async findByTemplateId(templateId: number): Promise<RecurringAssignment[]> {
    return this.repo.find({ where: { shiftTemplateId: templateId } });
  }

  async findActiveByTemplateSkill(
    templateId: number,
    templateSkillId: number,
    staffMemberId: number,
  ): Promise<RecurringAssignment | null> {
    const now = new Date();
    return this.repo
      .createQueryBuilder('ra')
      .where('ra.shift_template_id = :templateId', { templateId })
      .andWhere('ra.shift_template_skill_id = :templateSkillId', {
        templateSkillId,
      })
      .andWhere('ra.staff_member_id = :staffMemberId', { staffMemberId })
      .andWhere('ra.effective_from <= :now', { now })
      .andWhere('(ra.effective_to IS NULL OR ra.effective_to >= :now)', {
        now,
      })
      .getOne();
  }

  async create(
    data: Omit<RecurringAssignment, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<RecurringAssignment, Error>> {
    try {
      const ra = this.repo.create(data as RecurringAssignment);
      const saved = await this.repo.save(ra);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(`Failed to create recurring assignment`, e);
      return Result.err(
        e instanceof Error
          ? e
          : new Error('Failed to create recurring assignment'),
      );
    }
  }
}
