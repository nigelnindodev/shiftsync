import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftTemplate } from '../entities/shift-template.entity';
import { ShiftTemplateSkill } from '../entities/shift-template-skill.entity';
import { Result } from 'true-myth';

@Injectable()
export class ShiftTemplateRepository {
  private readonly logger = new Logger(ShiftTemplateRepository.name);

  constructor(
    @InjectRepository(ShiftTemplate)
    private readonly templateRepo: Repository<ShiftTemplate>,
    @InjectRepository(ShiftTemplateSkill)
    private readonly skillRepo: Repository<ShiftTemplateSkill>,
  ) {}

  async findById(id: number): Promise<ShiftTemplate | null> {
    return this.templateRepo.findOneBy({ id });
  }

  async findActiveTemplates(): Promise<ShiftTemplate[]> {
    return this.templateRepo.find({
      where: {},
      relations: ['skills'],
    });
  }

  async findActiveTemplatesUpToDate(upToDate: Date): Promise<ShiftTemplate[]> {
    return this.templateRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.skills', 'skills')
      .where('t.effective_from <= :upToDate', { upToDate })
      .andWhere('(t.effective_to IS NULL OR t.effective_to >= :upToDate)', {
        upToDate,
      })
      .getMany();
  }

  async create(
    data: Omit<ShiftTemplate, 'id' | 'createdAt' | 'updatedAt' | 'skills'>,
    skillSlots: Array<{ skillId: number; headcount: number }>,
  ): Promise<Result<ShiftTemplate, Error>> {
    try {
      const template = this.templateRepo.create(data as ShiftTemplate);
      const savedTemplate = await this.templateRepo.save(template);

      for (const slot of skillSlots) {
        const skillEntity = this.skillRepo.create({
          shiftTemplateId: savedTemplate.id,
          skillId: slot.skillId,
          headcount: slot.headcount,
        });
        await this.skillRepo.save(skillEntity);
      }

      return Result.ok(savedTemplate);
    } catch (e) {
      this.logger.error(`Failed to create shift template`, e);
      return Result.err(
        e instanceof Error ? e : new Error('Failed to create shift template'),
      );
    }
  }
}
