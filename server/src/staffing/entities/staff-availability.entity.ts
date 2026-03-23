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
import { UserProfile } from '../../users/entity/profile.entity';

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

@Entity('staff_availability')
export class StaffAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  @Index()
  staffMember: UserProfile;

  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
    name: 'day_of_week',
  })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'wall_start_time', type: 'time' })
  wallStartTime: string;

  @Column({ name: 'wall_end_time', type: 'time' })
  wallEndTime: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
