import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { EmployeeRepository } from '../employee.repository';
import { UsersRepository } from '../users.repository';
import { JwtService } from 'src/security/jwt/jwt.service';
import { AppConfigService } from 'src/config';
import { AUTH_COOKIE_NAME } from 'src/constants';
import {
  TestingLoginDto,
  TestingLoginResponseDto,
  TestingEmployeeDto,
} from '../dto/testing-login.dto';
import { runSeed } from 'src/seed/seed';

@ApiTags('testing')
@Controller('testing')
export class TestingController {
  private readonly logger = new Logger(TestingController.name);

  constructor(
    private readonly employeeRepo: EmployeeRepository,
    private readonly usersRepo: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly dataSource: DataSource,
  ) {}

  private assertTestingEnabled(): void {
    if (!this.config.enableTestingEndpoints) {
      throw new ForbiddenException('Testing endpoints are disabled');
    }
  }

  @Get('employees')
  @ApiOperation({ summary: 'List all employees for test login' })
  @ApiResponse({ status: 200, type: [TestingEmployeeDto] })
  async getEmployees(): Promise<TestingEmployeeDto[]> {
    this.assertTestingEnabled();

    const employees = await this.employeeRepo.findAllWithUser();

    return employees.map((emp) => ({
      id: emp.id,
      externalId: emp.externalId,
      email: emp.user.email,
      name: emp.user.name,
      role: emp.role,
      homeTimezone: emp.homeTimezone,
    }));
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: 'Test login by email or externalId' })
  @ApiResponse({ status: 200, type: TestingLoginResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async login(
    @Body() dto: TestingLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TestingLoginResponseDto> {
    this.assertTestingEnabled();

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        dto.identifier,
      );
    const user = isUuid
      ? await this.usersRepo.findByExternalId(dto.identifier)
      : await this.usersRepo.findByEmail(dto.identifier);

    if (user.isNothing) {
      throw new NotFoundException(
        `No user found with identifier: ${dto.identifier}`,
      );
    }

    const maybeEmployee = await this.employeeRepo.findByExternalIdWithUser(
      user.value.externalId,
    );

    if (maybeEmployee.isNothing) {
      throw new NotFoundException(
        `No employee profile found for: ${dto.identifier}`,
      );
    }

    const employee = maybeEmployee.value;

    const token = this.jwtService.sign({
      sub: user.value.externalId,
      email: user.value.email,
    });

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: false,
      secure: this.config.isProduction,
      sameSite: 'lax',
      maxAge: this.jwtService.tokenExpiryInSeconds * 1000,
    });

    this.logger.log('Test login successful', {
      externalId: user.value.externalId,
      role: employee.role,
    });

    return {
      id: employee.id,
      externalId: user.value.externalId,
      email: user.value.email,
      name: user.value.name,
      role: employee.role,
      homeTimezone: employee.homeTimezone,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear auth cookie (test logout)' })
  @ApiResponse({ status: 204 })
  logout(@Res({ passthrough: true }) res: Response): void {
    this.assertTestingEnabled();

    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: false,
      secure: this.config.isProduction,
      sameSite: 'lax',
    });
  }

  @Post('reset-database')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset database and re-run seed' })
  @ApiResponse({
    status: 200,
    description: 'Database reset and seeded successfully',
  })
  async resetDatabase(): Promise<{ message: string }> {
    this.assertTestingEnabled();
    this.logger.log('Resetting database...');

    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');

    if (tableNames.length > 0) {
      await this.dataSource.query('SET CONSTRAINTS ALL DEFERRED;');
      await this.dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
      this.logger.log('All tables truncated');
    }

    await runSeed(this.dataSource, false);
    this.logger.log('Database reset and seed completed');

    return { message: 'Database reset and seeded successfully' };
  }
}
