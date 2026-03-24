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
import { ShiftSkill } from './shift-skill.entity';
import { ShiftTemplate } from './shift-template.entity';
import { Schedule } from './schedule.entity';
import { Location } from '../../staffing/entities/location.entity';

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

  @ManyToOne(() => ShiftTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  @Index()
  template?: ShiftTemplate;

  @Column({ name: 'template_id', nullable: true })
  templateId?: number;

  @ManyToOne(() => Schedule, (schedule) => schedule.shifts, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'schedule_id' })
  @Index()
  schedule?: Schedule;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId?: number;

  @ManyToOne(() => Location, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  @Index()
  location: Location;

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

  @OneToMany(() => ShiftSkill, (shiftSkill) => shiftSkill.shift)
  skills: ShiftSkill[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
