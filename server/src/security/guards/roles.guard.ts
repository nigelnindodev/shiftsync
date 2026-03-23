import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { EmployeeRole } from 'src/users/user.types';
import { EmployeeRepository } from 'src/users/employee.repository';
import { JwtPayload } from 'src/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that checks the authenticated user's Employee role
 * against the roles specified via @Roles() decorator.
 *
 * Must be used after JwtAuthGuard (which sets request.user).
 *
 * On success, attaches the resolved Employee to request.employee
 * so downstream handlers don't need to re-query.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<
      EmployeeRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const jwtPayload = request['user'] as JwtPayload | undefined;

    if (!jwtPayload?.sub) {
      throw new ForbiddenException('No authenticated user');
    }

    const maybeEmployee = await this.employeeRepo.findByExternalId(
      jwtPayload.sub,
    );

    if (maybeEmployee.isNothing) {
      this.logger.warn('Employee not found for externalId', {
        externalId: jwtPayload.sub,
      });
      throw new ForbiddenException('Employee record not found');
    }

    const employee = maybeEmployee.value;

    if (!requiredRoles.includes(employee.role)) {
      throw new ForbiddenException(
        `Role ${employee.role} is not authorized. Required: ${requiredRoles.join(', ')}`,
      );
    }

    // Attach employee to request for downstream use
    request['employee'] = employee;
    return true;
  }
}
