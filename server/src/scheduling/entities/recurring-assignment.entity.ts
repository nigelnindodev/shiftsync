import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Assignment } from './assignment.entity';

@Entity('recurring_assignments')
export class RecurringAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne('ShiftTemplate', 'recurringAssignments', { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'shift_template_id' })
  shiftTemplateId: number;

  template?: import('./shift-template.entity').ShiftTemplate;

  @ManyToOne('ShiftTemplateSkill', 'recurringAssignments', {
    onDelete: 'CASCADE',
  })
  @Index()
  @Column({ name: 'shift_template_skill_id' })
  shiftTemplateSkillId: number;

  shiftTemplateSkill?: import('./shift-template-skill.entity').ShiftTemplateSkill;

  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @Column({ name: 'created_by_manager_id', nullable: true })
  createdByManagerId?: number;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo?: Date;

  @OneToMany('Assignment', 'recurringAssignment')
  assignments: Assignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
