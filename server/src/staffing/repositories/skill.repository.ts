import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from '../entities/skill.entity';
import { Maybe, Result } from 'true-myth';

@Injectable()
export class SkillRepository {
  private readonly logger = new Logger(SkillRepository.name);

  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
  ) {}

  async findById(id: number): Promise<Maybe<Skill>> {
    return Maybe.of(await this.skillRepository.findOneBy({ id }));
  }

  async findByName(name: string): Promise<Maybe<Skill>> {
    return Maybe.of(await this.skillRepository.findOneBy({ name }));
  }

  async findAll(): Promise<Skill[]> {
    return this.skillRepository.find();
  }

  async findAllActive(): Promise<Skill[]> {
    return this.skillRepository.findBy({ isActive: true });
  }

  async create(
    data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<Skill, Error>> {
    try {
      const skill = this.skillRepository.create(data);
      const saved = await this.skillRepository.save(skill);
      return Result.ok(saved);
    } catch (e) {
      this.logger.error(`Failed to create skill: ${data.name}`, e);
      return Result.err(
        e instanceof Error
          ? e
          : new Error(`Failed to create skill: ${data.name}`),
      );
    }
  }

  async deactivate(id: number): Promise<Result<void, Error>> {
    try {
      await this.skillRepository.update(id, { isActive: false });
      return Result.ok(undefined);
    } catch (e) {
      this.logger.error(`Failed to deactivate skill id: ${id}`, e);
      return Result.err(
        e instanceof Error ? e : new Error(`Failed to deactivate skill`),
      );
    }
  }
}
