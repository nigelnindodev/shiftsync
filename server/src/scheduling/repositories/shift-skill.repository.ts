import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { ShiftSkill } from '../entities/shift-skill.entity';

@Injectable()
export class ShiftSkillRepository {
  constructor(
    @InjectRepository(ShiftSkill)
    private readonly repo: Repository<ShiftSkill>,
  ) {}

  async findById(id: number): Promise<ShiftSkill | null> {
    return this.repo.findOneBy({ id });
  }

  async findOne(
    options: FindOneOptions<ShiftSkill>,
  ): Promise<ShiftSkill | null> {
    return this.repo.findOne(options);
  }

  async findByIdWithShift(id: number): Promise<ShiftSkill | null> {
    return this.repo.findOne({ where: { id }, relations: ['shift'] });
  }

  async findByShiftId(shiftId: number): Promise<ShiftSkill[]> {
    return this.repo.find({ where: { shiftId } });
  }
}
