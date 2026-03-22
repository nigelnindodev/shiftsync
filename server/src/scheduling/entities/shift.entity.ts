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
import { ShiftSkill } from './shift-skill.entity';

export enum ShiftState {
  OPEN = 'OPEN',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  LOCKED = 'LOCKED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'template_id', nullable: true })
  templateId?: number;

  @ManyToOne('Schedule', 'shifts', { onDelete: 'SET NULL', nullable: true })
  @Index()
  @Column({ name: 'schedule_id', nullable: true })
  scheduleId?: number;

  schedule?: import('./schedule.entity').Schedule;

  @Index()
  @Column({ name: 'location_id' })
  locationId: number;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: ShiftState,
    default: ShiftState.OPEN,
  })
  state: ShiftState;

  @OneToMany('ShiftSkill', 'shift')
  skills: ShiftSkill[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
