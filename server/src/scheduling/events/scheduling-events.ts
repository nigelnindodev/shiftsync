/**
 * Domain event types for the Scheduling context.
 * Every state change emits one of these events, which is persisted
 * to domain_events and published via Redis Transport.
 */

export const SchedulingEventPatterns = {
  SHIFT_CREATED: 'scheduling.shift.created',
  SHIFT_CANCELLED: 'scheduling.shift.cancelled',
  SHIFT_STATE_CHANGED: 'scheduling.shift.state_changed',
  ASSIGNMENT_CREATED: 'scheduling.assignment.created',
  ASSIGNMENT_REMOVED: 'scheduling.assignment.removed',
  SWAP_REQUESTED: 'scheduling.assignment.swap_requested',
  SWAP_ACCEPTED: 'scheduling.assignment.swap_accepted',
  SWAP_APPROVED: 'scheduling.assignment.swap_approved',
  SWAP_REJECTED: 'scheduling.assignment.swap_rejected',
  DROP_REQUESTED: 'scheduling.assignment.drop_requested',
  DROP_CLAIMED: 'scheduling.assignment.drop_claimed',
  DROP_APPROVED: 'scheduling.assignment.drop_approved',
  DROP_REJECTED: 'scheduling.assignment.drop_rejected',
} as const;

export interface ShiftCreatedEvent {
  shiftId: number;
  locationId: number;
  startTime: string;
  endTime: string;
  skills: Array<{ skillId: number; headcount: number }>;
  createdByManagerId?: number;
  timestamp: string;
}

export interface ShiftCancelledEvent {
  shiftId: number;
  cancelledByManagerId?: number;
  reason?: string;
  timestamp: string;
}

export interface ShiftStateChangedEvent {
  shiftId: number;
  previousState: string;
  newState: string;
  timestamp: string;
}

export interface AssignmentCreatedEvent {
  assignmentId: number;
  shiftSkillId: number;
  shiftId: number;
  staffMemberId: number;
  assignedByManagerId?: number;
  timestamp: string;
}

export interface AssignmentRemovedEvent {
  assignmentId: number;
  shiftSkillId: number;
  shiftId: number;
  staffMemberId: number;
  removedByManagerId?: number;
  reason: string;
  timestamp: string;
}

export interface SwapRequestedEvent {
  assignmentId: number;
  staffMemberId: number;
  targetStaffMemberId: number;
  shiftSkillId: number;
  shiftId: number;
  timestamp: string;
}

export interface SwapAcceptedEvent {
  originalAssignmentId: number;
  newAssignmentId: number;
  staffMemberId: number;
  shiftSkillId: number;
  shiftId: number;
  timestamp: string;
}

export interface SwapApprovedEvent {
  originalAssignmentId: number;
  newAssignmentId: number;
  approvedByManagerId: number;
  shiftId: number;
  timestamp: string;
}

export interface SwapRejectedEvent {
  originalAssignmentId: number;
  newAssignmentId: number;
  rejectedByManagerId: number;
  shiftId: number;
  timestamp: string;
}

export interface DropRequestedEvent {
  assignmentId: number;
  staffMemberId: number;
  shiftSkillId: number;
  shiftId: number;
  timestamp: string;
}

export interface DropClaimedEvent {
  originalAssignmentId: number;
  newAssignmentId: number;
  claimedByStaffId: number;
  shiftSkillId: number;
  shiftId: number;
  timestamp: string;
}

export interface DropApprovedEvent {
  originalAssignmentId: number;
  newAssignmentId: number;
  approvedByManagerId: number;
  shiftId: number;
  timestamp: string;
}

export interface DropRejectedEvent {
  originalAssignmentId: number;
  newAssignmentId: number;
  rejectedByManagerId: number;
  shiftId: number;
  timestamp: string;
}
