import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ShiftTemplateSkill } from './shift-template-skill.entity';
import { RecurringAssignment } from './recurring-assignment.entity';

@Entity('shift_templates')
export class ShiftTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'location_id' })
  locationId: number;

  @Column({ name: 'wall_start_time', type: 'time' })
  wallStartTime: string;

  @Column({ name: 'wall_end_time', type: 'time' })
  wallEndTime: string;

  @Column({ name: 'recurrence_days', type: 'simple-array' })
  recurrenceDays: string[];

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo?: Date;

  @OneToMany('ShiftTemplateSkill', 'template')
  skills: ShiftTemplateSkill[];

  @OneToMany('RecurringAssignment', 'template')
  recurringAssignments: RecurringAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
