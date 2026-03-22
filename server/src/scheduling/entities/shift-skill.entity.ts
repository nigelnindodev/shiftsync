import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Assignment } from './assignment.entity';
import { Shift } from './shift.entity';

@Entity('shift_skills')
export class ShiftSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('Shift', 'skills', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift?: Shift;

  @Index()
  @Column({ name: 'shift_id' })
  shiftId: number;

  @Column({ name: 'skill_id' })
  skillId: number;

  @Column({ default: 1 })
  headcount: number;

  @OneToMany('Assignment', 'shiftSkill')
  assignments: Assignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
