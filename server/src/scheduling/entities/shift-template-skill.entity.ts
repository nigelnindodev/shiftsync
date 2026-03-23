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
import { RecurringAssignment } from './recurring-assignment.entity';
import { ShiftTemplate } from './shift-template.entity';

@Entity('shift_template_skills')
@Check('headcount_positive', '"headcount" > 0')
export class ShiftTemplateSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ShiftTemplate, (template) => template.skills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shift_template_id' })
  @Index()
  template: ShiftTemplate;

  @Column({ name: 'shift_template_id' })
  shiftTemplateId: number;

  @Column({ name: 'skill_id' })
  skillId: number;

  @Column({ default: 1 })
  headcount: number;

  @OneToMany(
    () => RecurringAssignment,
    (recurringAssignment) => recurringAssignment.shiftTemplateSkill,
  )
  recurringAssignments: RecurringAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
