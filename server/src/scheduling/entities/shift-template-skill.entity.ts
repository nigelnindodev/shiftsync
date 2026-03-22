import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('shift_template_skills')
export class ShiftTemplateSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('ShiftTemplate', 'skills', { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'shift_template_id' })
  shiftTemplateId: number;

  template?: import('./shift-template.entity').ShiftTemplate;

  @Column({ name: 'skill_id' })
  skillId: number;

  @Column({ default: 1 })
  headcount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
