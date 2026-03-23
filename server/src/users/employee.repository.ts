import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from './entity/employee.entity';
import { Repository } from 'typeorm';
import { Maybe, Result } from 'true-myth';
import { EmployeeCreate, EmployeeUpdate } from './employee.types';

@Injectable()
export class EmployeeRepository {
  private readonly logger = new Logger(EmployeeRepository.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async findById(id: number): Promise<Maybe<Employee>> {
    return Maybe.of(await this.employeeRepository.findOneBy({ id }));
  }

  async findByExternalId(externalId: string): Promise<Maybe<Employee>> {
    return Maybe.of(await this.employeeRepository.findOneBy({ externalId }));
  }

  async findByExternalIdWithUser(externalId: string): Promise<Maybe<Employee>> {
    const employee = await this.employeeRepository.findOne({
      where: { externalId },
      relations: ['user'],
    });

    return Maybe.of(employee);
  }

  async createEmployee(
    input: EmployeeCreate,
  ): Promise<Result<Employee, Error>> {
    this.logger.log(
      `Attempting to create employee for external id ${input.externalId}`,
    );
    try {
      const employee = this.employeeRepository.create({
        externalId: input.externalId,
        role: input.role,
        homeTimezone: input.homeTimezone,
        desiredHoursPerWeek: input.desiredHoursPerWeek,
        desiredHoursNote: input.desiredHoursNote,
      });
      const savedEmployee = await this.employeeRepository.save(employee);
      return Result.ok(savedEmployee);
    } catch (e) {
      this.logger.error(
        `Failed to create employee with external id ${input.externalId}`,
      );
      return Result.err(
        e instanceof Error
          ? e
          : new Error(
              `Failed to create employee for external id ${input.externalId}`,
            ),
      );
    }
  }

  async updateEmployee(
    employeeData: EmployeeUpdate,
  ): Promise<Result<Employee, Error>> {
    this.logger.log(
      `Attempting to update employee for external id ${employeeData.externalId}`,
    );
    try {
      const maybeEmployee = await this.findByExternalId(
        employeeData.externalId,
      );

      if (maybeEmployee.isNothing)
        return Result.err(
          new Error(
            `Cannot find employee with external id ${employeeData.externalId} for update`,
          ),
        );

      const updatedUser = await this.employeeRepository.save({
        ...maybeEmployee.value,
        ...employeeData,
      });
      return Result.ok(updatedUser);
    } catch (e) {
      this.logger.error(
        `Failed to update employee with external id ${employeeData.externalId}`,
      );
      return Result.err(
        e instanceof Error
          ? e
          : new Error(
              `Failed to update employee for external id ${employeeData.externalId}`,
            ),
      );
    }
  }
}
