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
import { Skill } from './skill.entity';

@Entity('staff_skills')
@Unique('uq_staff_skill', ['staffMemberId', 'skillId'])
export class StaffSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, (profile) => profile.staffSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember?: UserProfile;

  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @ManyToOne(() => Skill, (skill) => skill.staffSkills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill?: Skill;

  @Index()
  @Column({ name: 'skill_id' })
  skillId: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
