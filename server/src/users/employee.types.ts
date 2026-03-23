import { EmployeeRole } from './user.types';

export type EmployeeCreate = {
  externalId: string;
  role: EmployeeRole;
  homeTimezone?: string;
  desiredHoursPerWeek?: number;
  desiredHoursNote?: string;
};

export type EmployeeUpdate = {
  externalId: string;
  homeTimezone?: string;
  desiredHoursPerWeek?: number;
  desiredHoursNote?: string;
};
