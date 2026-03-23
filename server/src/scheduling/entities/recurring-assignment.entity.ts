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
import { UserProfile } from '../../users/entity/profile.entity';
import { ShiftTemplate } from './shift-template.entity';
import { ShiftTemplateSkill } from './shift-template-skill.entity';

@Entity('recurring_assignments')
export class RecurringAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ShiftTemplate, (template) => template.recurringAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shift_template_id' })
  @Index()
  template: ShiftTemplate;

  @Column({ name: 'shift_template_id' })
  shiftTemplateId: number;

  @ManyToOne(() => ShiftTemplateSkill, (skill) => skill.recurringAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shift_template_skill_id' })
  @Index()
  shiftTemplateSkill: ShiftTemplateSkill;

  @Column({ name: 'shift_template_skill_id' })
  shiftTemplateSkillId: number;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  @Index()
  staffMember: UserProfile;

  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @Column({ name: 'created_by_manager_id', nullable: true })
  createdByManagerId?: number;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo?: Date;

  @OneToMany(() => Assignment, (assignment) => assignment.recurringAssignment)
  assignments: Assignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
