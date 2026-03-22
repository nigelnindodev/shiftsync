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
import { Skill } from './skill.entity';

@Entity('staff_skills')
@Unique(['staffMember', 'skill'])
export class StaffSkill {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserProfile, (profile) => profile.staffSkills, {
    onDelete: 'CASCADE',
  })
  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @ManyToOne(() => Skill, (skill) => skill.staffSkills, { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'skill_id' })
  skillId: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
