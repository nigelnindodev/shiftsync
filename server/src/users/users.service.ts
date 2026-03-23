import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import {
  ExternalEmployeeDetailsDto,
  GetOrCreateUserDto,
  UpdateUserDto,
} from './dto/user.dto';
import { User } from './entity/user.entity';
import { Maybe, Result } from 'true-myth';
import { EmployeeRepository } from './employee.repository';
import { Employee } from './entity/employee.entity';
import { EmployeeRole } from './user.types';
import { AppConfigService } from '../config';
import { EmployeeUpdate } from './employee.types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly employeeRepository: EmployeeRepository,
    private readonly configService: AppConfigService,
  ) {}

  async createUser(data: GetOrCreateUserDto): Promise<Maybe<User>> {
    const result = await this.userRepository.createUser(data);

    if (result.isErr) {
      this.logger.error('Failed to create user', {
        email: data.email,
        error: result.error,
      });
      return Maybe.nothing();
    }

    return Maybe.of(result.value);
  }

  async getEmployee(
    externalId: string,
  ): Promise<Maybe<ExternalEmployeeDetailsDto>> {
    const maybeEmployeeWithUser =
      await this.employeeRepository.findByExternalIdWithUser(externalId);
    return maybeEmployeeWithUser.map((employeeWithUser) => {
      return {
        ...employeeWithUser.user,
        employee: employeeWithUser,
      };
    });
  }

  async getOrCreateUser({
    email,
    name,
  }: {
    email: string;
    name: string;
  }): Promise<Maybe<User>> {
    const maybeUser = await this.userRepository.findByEmail(email);

    return await maybeUser.match({
      Just: async (user) => {
        await this.ensureEmployee(user.externalId, 'existing user');
        return Maybe.of(user);
      },
      Nothing: async () => {
        const maybeNewUser = await this.createUser({ email, name });

        if (maybeNewUser.isJust) {
          await this.ensureEmployee(maybeNewUser.value.externalId, 'new user');
        }

        return maybeNewUser;
      },
    });
  }

  async updateUser(
    data: UpdateUserDto,
  ): Promise<Maybe<ExternalEmployeeDetailsDto>> {
    this.logger.log('Processing update details request for user', {
      externalId: data.externalId,
    });

    const repoInput: EmployeeUpdate = {
      externalId: data.externalId,
      homeTimezone: data.homeTimezone,
      desiredHoursPerWeek: data.desiredHoursPerWeek,
      desiredHoursNote: data.desiredHoursNote,
    };

    const result = await this.employeeRepository.updateEmployee(repoInput);

    if (result.isErr) {
      this.logger.error(`Update for user failed`, {
        externalId: data.externalId,
        error: result.error,
      });
      return Maybe.nothing();
    }

    // We need additional query to merge with user entity here
    const maybeEmployeeWithUser =
      await this.employeeRepository.findByExternalIdWithUser(data.externalId);
    return maybeEmployeeWithUser.map((employeeWithUser) => {
      return {
        ...employeeWithUser.user,
        employee: employeeWithUser,
      };
    });
  }

  private async ensureEmployee(
    externalId: string,
    context: string,
  ): Promise<void> {
    const employeeResult = await this.getOrCreateEmployee(externalId);

    employeeResult.match({
      Ok: () => {},
      Err: () => {
        this.logger.warn(`Failed to create employee for ${context}`, {
          externalId,
        });
      },
    });
  }

  private async getOrCreateEmployee(
    externalId: string,
  ): Promise<Result<Employee, Error>> {
    const maybeEmployee =
      await this.employeeRepository.findByExternalId(externalId);
    return await maybeEmployee.match({
      Just: (employee) => Promise.resolve(Result.ok(employee)),
      Nothing: async () => {
        const defaultTimezone =
          this.configService.get<string>('DEFAULT_TIMEZONE') ?? 'UTC';
        const createEmployeeResult =
          await this.employeeRepository.createEmployee({
            externalId,
            role: EmployeeRole.STAFF,
            homeTimezone: defaultTimezone,
          });
        return createEmployeeResult.match({
          Ok: (employee) => Promise.resolve(Result.ok(employee)),
          Err: (e) => {
            this.logger.error('Failed to create employee', { externalId });
            return Promise.resolve(Result.err(e));
          },
        });
      },
    });
  }
}
