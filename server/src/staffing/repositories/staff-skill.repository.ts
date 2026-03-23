import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffSkill } from '../entities/staff-skill.entity';
import { Result } from 'true-myth';

@Injectable()
export class StaffSkillRepository {
  private readonly logger = new Logger(StaffSkillRepository.name);

  constructor(
    @InjectRepository(StaffSkill)
    private readonly staffSkillRepository: Repository<StaffSkill>,
  ) {}

  async findByStaffMember(staffMemberId: number): Promise<StaffSkill[]> {
    return this.staffSkillRepository.find({
      where: { staffMemberId },
      relations: ['skill'],
    });
  }

  async findStaffWithSkill(
    locationId: number,
    skillId: number,
  ): Promise<number[]> {
    const results = await this.staffSkillRepository
      .createQueryBuilder('ss')
      .innerJoin('ss.skill', 's')
      .innerJoin(
        'location_certifications',
        'lc',
        'lc.staff_member_id = ss.staff_member_id',
      )
      .where('ss.skill_id = :skillId', { skillId })
      .andWhere('lc.location_id = :locationId', { locationId })
      .andWhere('s.is_active = true')
      .select('DISTINCT ss.staff_member_id', 'staffMemberId')
      .getRawMany<{ staffMemberId: number }>();
    return results.map((r) => r.staffMemberId);
  }

  async hasSkill(staffMemberId: number, skillId: number): Promise<boolean> {
    const found = await this.staffSkillRepository.findOne({
      where: { staffMemberId, skillId },
    });
    return found !== null;
  }

  async assignSkill(
    staffMemberId: number,
    skillId: number,
  ): Promise<Result<StaffSkill, Error>> {
    try {
      const existing = await this.staffSkillRepository.findOne({
        where: { staffMemberId, skillId },
      });
      if (existing) {
        return Result.ok(existing);
      }
      const staffSkill = this.staffSkillRepository.create({
        staffMemberId,
        skillId,
      });
      const saved = await this.staffSkillRepository.save(staffSkill);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(
        `Failed to assign skill ${skillId} to staff ${staffMemberId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to assign skill'),
      );
    }
  }

  async removeSkill(
    staffMemberId: number,
    skillId: number,
  ): Promise<Result<void, Error>> {
    try {
      await this.staffSkillRepository.delete({ staffMemberId, skillId });
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(
        `Failed to remove skill ${skillId} from staff ${staffMemberId}`,
        e,
      );
      return Result.err(
        e instanceof Error ? e : new Error('Failed to remove skill'),
      );
    }
  }
}
