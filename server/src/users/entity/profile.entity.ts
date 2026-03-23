import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../user.types';
import { StaffSkill } from '../../staffing/entities/staff-skill.entity';

@Entity('user_profile')
@Check(
  'desired_hours_positive',
  '"desired_hours_per_week" IS NULL OR "desired_hours_per_week" >= 0',
)
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'external_id', type: 'uuid' })
  externalId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'external_id', referencedColumnName: 'externalId' })
  user: User;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STAFF,
  })
  role: UserRole;

  @Column({ name: 'home_timezone' })
  homeTimezone: string;

  @Column({ name: 'desired_hours_per_week', type: 'int', nullable: true })
  desiredHoursPerWeek?: number;

  @Column({ name: 'desired_hours_note', nullable: true })
  desiredHoursNote?: string;

  @OneToMany(() => StaffSkill, (staffSkill) => staffSkill.staffMember)
  staffSkills: StaffSkill[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
