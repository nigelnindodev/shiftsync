import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from 'src/users/user.types';

export const ROLES_KEY = 'roles';

/**
 * Decorator that specifies which EmployeeRoles are allowed
 * to access a route handler.
 *
 * Usage: @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
 */
export const Roles = (...roles: EmployeeRole[]) =>
  SetMetadata(ROLES_KEY, roles);
