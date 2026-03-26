import type { EmployeeRole } from './scheduling';

export interface EmployeeProfile {
  id: number;
  externalId: string;
  role: EmployeeRole;
  homeTimezone?: string;
  desiredHoursPerWeek?: number;
  desiredHoursNote?: string;
}

export interface ExternalEmployeeDetailsDto {
  externalId: string;
  email: string;
  name: string;
  employee?: EmployeeProfile | null;
}

export interface UpdateEmployeeDto {
  homeTimezone?: string;
  desiredHoursPerWeek?: number;
  desiredHoursNote?: string;
}
