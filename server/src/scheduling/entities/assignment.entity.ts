import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RecurringAssignment } from './recurring-assignment.entity';
import { ShiftSkill } from './shift-skill.entity';
import { UserProfile } from '../../users/entity/profile.entity';

export enum AssignmentState {
  ASSIGNED = 'ASSIGNED',
  SWAP_REQUESTED = 'SWAP_REQUESTED',
  SWAP_PENDING_APPROVAL = 'SWAP_PENDING_APPROVAL',
  DROP_REQUESTED = 'DROP_REQUESTED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  COMPLETED = 'COMPLETED',
}

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ShiftSkill, (shiftSkill) => shiftSkill.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'shift_skill_id' })
  @Index()
  shiftSkill: ShiftSkill;

  @Column({ name: 'shift_skill_id' })
  shiftSkillId: number;

  @ManyToOne(
    () => RecurringAssignment,
    (recurringAssignment) => recurringAssignment.assignments,
    { onDelete: 'SET NULL', nullable: true },
  )
  @JoinColumn({ name: 'recurring_assignment_id' })
  @Index()
  recurringAssignment?: RecurringAssignment;

  @Column({ name: 'recurring_assignment_id', nullable: true })
  recurringAssignmentId?: number;

  @ManyToOne(() => UserProfile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_member_id' })
  staffMember: UserProfile;

  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @Column({ name: 'assigned_by_manager_id', nullable: true })
  assignedByManagerId?: number;

  @Column({ name: 'swap_target_id', nullable: true })
  swapTargetId?: number;

  @Column({
    type: 'enum',
    enum: AssignmentState,
    default: AssignmentState.ASSIGNED,
  })
  state: AssignmentState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
