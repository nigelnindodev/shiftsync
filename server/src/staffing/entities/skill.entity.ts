import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StaffSkill } from './staff-skill.entity';
import { ShiftSkill } from '../../scheduling/entities/shift-skill.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => StaffSkill, (staffSkill) => staffSkill.skill)
  staffSkills: StaffSkill[];

  @OneToMany(() => ShiftSkill, (shiftSkill) => shiftSkill.skill)
  shiftSkills: ShiftSkill[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
