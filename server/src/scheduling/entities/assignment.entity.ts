import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @ManyToOne('ShiftSkill', 'assignments', { onDelete: 'CASCADE' })
  @Index()
  @Column({ name: 'shift_skill_id' })
  shiftSkillId: number;

  @Index()
  @Column({ name: 'staff_member_id' })
  staffMemberId: number;

  @Column({ name: 'assigned_by_manager_id', nullable: true })
  assignedByManagerId?: number;

  @ManyToOne('RecurringAssignment', 'assignments', {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @Index()
  @Column({ name: 'recurring_assignment_id', nullable: true })
  recurringAssignmentId?: number;

  recurringAssignment?: import('./recurring-assignment.entity').RecurringAssignment;

  shiftSkill?: import('./shift-skill.entity').ShiftSkill;

  @Column({
    type: 'enum',
    enum: AssignmentState,
    default: AssignmentState.ASSIGNED,
  })
  state: AssignmentState;

  @Column({ name: 'swap_target_id', nullable: true })
  swapTargetId?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
