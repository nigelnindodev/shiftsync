import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftSkill } from '../entities/shift-skill.entity';

@Injectable()
export class ShiftSkillRepository {
  private readonly logger = new Logger(ShiftSkillRepository.name);

  constructor(
    @InjectRepository(ShiftSkill)
    private readonly repo: Repository<ShiftSkill>,
  ) {}

  async findById(id: number): Promise<ShiftSkill | null> {
    return this.repo.findOneBy({ id });
  }

  async findByIdWithShift(id: number): Promise<ShiftSkill | null> {
    return this.repo.findOne({ where: { id }, relations: ['shift'] });
  }

  async findByShiftId(shiftId: number): Promise<ShiftSkill[]> {
    return this.repo.find({ where: { shiftId } });
  }
}
