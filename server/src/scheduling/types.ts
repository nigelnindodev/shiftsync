export const ConstraintCode = {
  OK: 'OK',
  SKILL_MISMATCH: 'SKILL_MISMATCH',
  SHIFT_NOT_FOUND: 'SHIFT_NOT_FOUND',
  NOT_CERTIFIED: 'NOT_CERTIFIED',
  UNAVAILABLE: 'UNAVAILABLE',
  AVAILABILITY_WINDOW_MISMATCH: 'AVAILABILITY_WINDOW_MISMATCH',
  OVERLAP: 'OVERLAP',
  REST_GAP: 'REST_GAP',
  DAILY_HOURS_EXCEEDED: 'DAILY_HOURS_EXCEEDED',
  DAILY_HOURS_HIGH: 'DAILY_HOURS_HIGH',
  WEEKLY_HOURS_EXCEEDED: 'WEEKLY_HOURS_EXCEEDED',
  WEEKLY_HOURS_APPROACHING: 'WEEKLY_HOURS_APPROACHING',
  CONSECUTIVE_DAYS_7: 'CONSECUTIVE_DAYS_7',
  CONSECUTIVE_DAYS_6: 'CONSECUTIVE_DAYS_6',
} as const;

export type ConstraintCode =
  (typeof ConstraintCode)[keyof typeof ConstraintCode];

export type ConstraintViolationType = 'VIOLATION' | 'WARNING';

export interface ConstraintCheckResult {
  type: ConstraintViolationType;
  code: ConstraintCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface StaffCandidate {
  staffMemberId: number;
  name: string;
  hoursThisWeek: number;
  warnings: ConstraintCheckResult[];
}

export interface ConstraintResult {
  valid: boolean;
  violations: ConstraintCheckResult[];
  warnings: ConstraintCheckResult[];
  suggestions: StaffCandidate[];
}

export interface CreateAssignmentContext {
  staffMemberId: number;
  shiftSkillId: number;
  shiftId: number;
}
