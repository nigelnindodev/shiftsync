import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserProfile } from '../../users/entity/profile.entity';
import { Location } from './location.entity';

@Entity('manager_locations')
@Unique('uq_manager_location', ['managerId', 'locationId'])
export class ManagerLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'manager_id' })
  manager?: UserProfile;

  @Index()
  @Column({ name: 'manager_id' })
  managerId: number;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  @Index()
  @Column({ name: 'location_id' })
  locationId: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
