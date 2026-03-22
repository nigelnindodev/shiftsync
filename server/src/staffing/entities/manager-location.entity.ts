import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserProfile } from '../../users/entity/profile.entity';
import { Location } from './location.entity';

@Entity('manager_locations')
@Unique(['manager', 'location'])
export class ManagerLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'manager_id' })
  managerId: number;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'location_id' })
  locationId: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
