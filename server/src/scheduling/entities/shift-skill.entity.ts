import {
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
import { Assignment } from './assignment.entity';
import { Shift } from './shift.entity';

@Entity('shift_skills')
export class ShiftSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Shift, (shift) => shift.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  @Index()
  shift: Shift;

  @Column({ name: 'shift_id' })
  shiftId: number;

  @Column({ name: 'skill_id' })
  skillId: number;

  @Column({ default: 1 })
  headcount: number;

  @OneToMany(() => Assignment, (assignment) => assignment.shiftSkill)
  assignments: Assignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
