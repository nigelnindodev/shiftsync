import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shift } from './shift.entity';

export enum ScheduleState {
  BUILDING = 'BUILDING',
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@Entity('schedules')
@Index('idx_schedule_location_week', ['locationId', 'weekOf'], { unique: true })
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'location_id' })
  locationId: number;

  @Column({ name: 'week_of', type: 'date' })
  weekOf: string;

  @Column({
    type: 'enum',
    enum: ScheduleState,
    default: ScheduleState.BUILDING,
  })
  state: ScheduleState;

  @Column({ name: 'cutoff_hours', type: 'int', default: 48 })
  cutoffHours: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'published_by_manager_id', nullable: true })
  publishedByManagerId?: number;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt?: Date;

  @OneToMany(() => Shift, (shift) => shift.schedule)
  shifts: Shift[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
