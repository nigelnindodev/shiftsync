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

@Entity('location_certifications')
@Unique('uq_location_cert_staff_location', ['staffMemberId', 'locationId'])
export class LocationCertification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: UserProfile;

  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  @Index()
  @Column({ name: 'location_id' })
  locationId: number;

  @CreateDateColumn({ name: 'certified_at' })
  certifiedAt: Date;
}
