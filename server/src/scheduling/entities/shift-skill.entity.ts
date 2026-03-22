import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Assignment } from './assignment.entity';

@Entity('shift_skills')
export class ShiftSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Shift', 'skills', { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'shift_id' })
  shiftId: number;

  shift?: import('./shift.entity').Shift;

  @Column({ name: 'skill_id' })
  skillId: number;

  @Column({ default: 1 })
  headcount: number;

  @OneToMany('Assignment', 'shiftSkill')
  assignments: Assignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
