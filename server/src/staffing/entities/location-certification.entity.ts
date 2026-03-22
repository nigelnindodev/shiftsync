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

@Entity('location_certifications')
@Unique(['staffMember', 'location'])
export class LocationCertification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'location_id' })
  locationId: number;

  @CreateDateColumn({ name: 'certified_at' })
  certifiedAt: Date;
}
