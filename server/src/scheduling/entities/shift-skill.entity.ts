import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Min } from 'class-validator';
import { Assignment } from './assignment.entity';
import { Shift } from './shift.entity';
import { Skill } from '../../staffing/entities/skill.entity';

@Entity('shift_skills')
@Check('headcount_positive', '"headcount" > 0')
export class ShiftSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Shift, (shift) => shift.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  @Index()
  shift: Shift;

  @Column({ name: 'shift_id' })
  shiftId: number;

  @ManyToOne(() => Skill, (skill) => skill.shiftSkills)
  @JoinColumn({ name: 'skill_id' })
  @Index()
  skill?: Skill;

  @Column({ name: 'skill_id' })
  skillId: number;

  @Min(1)
  @Column({ default: 1 })
  headcount: number;

  @OneToMany(() => Assignment, (assignment) => assignment.shiftSkill)
  assignments: Assignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
