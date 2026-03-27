// Domain types matching server scheduling DTOs.
// All timestamps are UTC strings from the server.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type EmployeeRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type AssignmentState =
  | 'ASSIGNED'
  | 'SWAP_REQUESTED'
  | 'SWAP_PENDING_APPROVAL'
  | 'DROP_REQUESTED'
  | 'DROP_PENDING_APPROVAL'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'COMPLETED';

// ---------------------------------------------------------------------------
// Testing
// ---------------------------------------------------------------------------

export interface TestingEmployeeDto {
  id: number;
  externalId: string;
  email: string;
  name: string;
  role: string;
  homeTimezone?: string;
}

export interface TestingLoginDto {
  identifier: string;
}

// ---------------------------------------------------------------------------
// Staff Schedule
// ---------------------------------------------------------------------------

export interface StaffScheduleEntryDto {
  assignmentId: number;
  shiftId: number;
  state: string;
  startTime: string;
  endTime: string;
  locationId: number;
  locationName: string;
  locationTimezone: string;
  skillId: number;
  skillName: string;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export interface StaffAvailabilityResponseDto {
  id: number;
  dayOfWeek: DayOfWeek;
  wallStartTime: string;
  wallEndTime: string;
}

export interface StaffAvailabilityExceptionResponseDto {
  id: number;
  date: string;
  isAvailable: boolean;
  wallStartTime?: string;
  wallEndTime?: string;
}

export interface UpsertAvailabilityDto {
  dayOfWeek: DayOfWeek;
  wallStartTime: string;
  wallEndTime: string;
}

export interface UpsertExceptionDto {
  date: string;
  isAvailable: boolean;
  wallStartTime?: string;
  wallEndTime?: string;
}

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------

export interface ShiftSkillSlotResponseDto {
  id: number;
  skillId: number;
  skillName: string;
  headcount: number;
  assignedCount: number;
}

export interface ShiftResponseDto {
  id: number;
  locationId: number;
  startTime: string;
  endTime: string;
  state: string;
  skills: ShiftSkillSlotResponseDto[];
}

export interface CreateShiftDto {
  locationId: number;
  startTime: string;
  endTime: string;
  skills: { skillId: number; headcount: number }[];
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export interface AssignmentResponseDto {
  assignmentId: number;
  staffMemberId: number;
  staffName: string;
  state: string;
}

export interface SlotAssignmentsResponseDto {
  slotId: number;
  skillId: number;
  skillName: string;
  headcount: number;
  assignedCount: number;
  assignments: AssignmentResponseDto[];
}

export interface EligibleStaffDto {
  staffMemberId: number;
  name: string;
  hoursThisWeek: number;
  warnings: { code: string; message: string }[];
}

export interface CreateAssignmentDto {
  staffMemberId: number;
}

export interface RequestSwapDto {
  targetStaffMemberId: number;
}

export interface ApproveSwapDropDto {
  approved: boolean;
}

// ---------------------------------------------------------------------------
// Pending Approvals
// ---------------------------------------------------------------------------

export type PendingApprovalState =
  | 'SWAP_PENDING_APPROVAL'
  | 'DROP_PENDING_APPROVAL';

export interface PendingApprovalDto {
  assignmentId: number;
  staffMemberId: number;
  staffName: string;
  state: PendingApprovalState;
  shiftId: number;
  slotId: number;
  shiftDate: string;
  shiftTime: string;
  locationId: number;
  locationName: string;
  skillName: string;
  swapTargetName: string | null;
}

// ---------------------------------------------------------------------------
// Reference Data
// ---------------------------------------------------------------------------

export interface LocationResponseDto {
  id: number;
  name: string;
  timezone: string;
}

export interface SkillResponseDto {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Manager — Staff
// ---------------------------------------------------------------------------

export interface StaffLocationDto {
  id: number;
  externalId: string;
  name: string;
  email: string;
  homeTimezone: string;
  desiredHoursPerWeek?: number;
  desiredHoursNote?: string;
}

export interface CreateStaffDto {
  email: string;
  name: string;
  homeTimezone: string;
  desiredHoursPerWeek?: number;
  desiredHoursNote?: string;
  skillIds?: number[];
}
