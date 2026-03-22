import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ name: 'timezone', default: 'America/New_York' })
  timezone: string;

  @Column({ default: 'Coastal Eats' })
  brand: string;

  @Column({ name: 'cutoff_hours', type: 'int', default: 48 })
  cutoffHours: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
