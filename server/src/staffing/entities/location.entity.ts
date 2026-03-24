import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Shift } from '../../scheduling/entities/shift.entity';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  name: string;

  // TODO: Should we always keep a default timezone?
  @Column({ name: 'timezone', default: 'America/New_York' })
  timezone: string;

  @Column({ default: 'Coastal Eats' })
  brand: string;

  @Column({ name: 'cutoff_hours', type: 'int', default: 48 })
  cutoffHours: number;

  @OneToMany(() => Shift, (shift) => shift.location)
  shifts: Shift[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
