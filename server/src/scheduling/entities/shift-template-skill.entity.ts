import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShiftTemplate } from './shift-template.entity';

@Entity('shift_template_skills')
export class ShiftTemplateSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('ShiftTemplate', 'skills', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_template_id' })
  template?: ShiftTemplate;

  @Index()
  @Column({ name: 'shift_template_id' })
  shiftTemplateId: number;

  @Column({ name: 'skill_id' })
  skillId: number;

  @Column({ default: 1 })
  headcount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
