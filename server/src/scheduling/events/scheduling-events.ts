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
