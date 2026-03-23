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

@Entity('staff_availability_exceptions')
export class StaffAvailabilityException {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: UserProfile;

  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'is_available', default: false })
  isAvailable: boolean;

  @Column({ name: 'wall_start_time', type: 'time', nullable: true })
  wallStartTime?: string;

  @Column({ name: 'wall_end_time', type: 'time', nullable: true })
  wallEndTime?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
