import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../security/guards/jwt-auth-guard';
import { RolesGuard } from '../../security/guards/roles.guard';
import { Roles } from '../../security/decorators/roles.decorator';
import { EmployeeRole } from '../../users/user.types';
import { CurrentUser } from '../../auth/decorators/current-user-decorator';
import { EmployeeRepository } from '../../users/employee.repository';
import { UsersRepository } from '../../users/users.repository';
import { ManagerLocationRepository } from '../repositories/manager-location.repository';
import { LocationCertificationRepository } from '../repositories/location-certification.repository';
import { StaffSkillRepository } from '../repositories/staff-skill.repository';
import { LocationResponseDto } from '../../scheduling/dto/location-response.dto';
import {
  StaffLocationDto,
  CreateStaffDto,
} from '../../scheduling/dto/staff-location.dto';

@ApiTags('manager')
@ApiBearerAuth()
@Controller('manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
export class ManagerController {
  constructor(
    private readonly employeeRepo: EmployeeRepository,
    private readonly usersRepo: UsersRepository,
    private readonly managerLocationRepo: ManagerLocationRepository,
    private readonly locationCertRepo: LocationCertificationRepository,
    private readonly staffSkillRepo: StaffSkillRepository,
  ) {}

  @Get('locations')
  @ApiOperation({ summary: 'Get locations assigned to the current manager' })
  @ApiResponse({ status: 200, type: [LocationResponseDto] })
  async getManagerLocations(
    @CurrentUser('sub') externalId: string,
  ): Promise<LocationResponseDto[]> {
    const maybeEmployee = await this.employeeRepo.findByExternalId(externalId);

    if (maybeEmployee.isNothing) {
      return [];
    }

    const managerLocations =
      await this.managerLocationRepo.findLocationsByManager(
        maybeEmployee.value.id,
      );

    return managerLocations.map((ml) => ({
      id: ml.locationId,
      name: ml.location?.name ?? '',
      timezone: ml.location?.timezone ?? 'UTC',
    }));
  }

  @Get('locations/:locationId/staff')
  @ApiOperation({ summary: 'List staff certified at a location' })
  @ApiResponse({ status: 200, type: [StaffLocationDto] })
  async getStaffForLocation(
    @CurrentUser('sub') externalId: string,
    @Param('locationId', ParseIntPipe) locationId: number,
  ): Promise<StaffLocationDto[]> {
    await this.assertManagerOfLocation(externalId, locationId);

    const certs = await this.locationCertRepo.findByLocation(locationId);

    return certs.map((cert) => {
      const emp = cert.staffMember!;
      const user = emp.user;
      return {
        id: emp.id,
        externalId: emp.externalId,
        name: user.name,
        email: user.email,
        homeTimezone: emp.homeTimezone,
        desiredHoursPerWeek: emp.desiredHoursPerWeek,
        desiredHoursNote: emp.desiredHoursNote,
        skills: (emp.staffSkills ?? [])
          .map((ss) => ss.skill?.name)
          .filter((name): name is string => !!name)
          .sort(),
      };
    });
  }

  @Post('locations/:locationId/staff')
  @ApiOperation({ summary: 'Create a new staff member at a location' })
  @ApiResponse({ status: 201, type: StaffLocationDto })
  async createStaffForLocation(
    @CurrentUser('sub') externalId: string,
    @Param('locationId', ParseIntPipe) locationId: number,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffLocationDto> {
    await this.assertManagerOfLocation(externalId, locationId);

    const maybeExistingUser = await this.usersRepo.findByEmail(dto.email);
    if (maybeExistingUser.isJust) {
      throw new ForbiddenException(
        `A user with email ${dto.email} already exists`,
      );
    }

    const userResult = await this.usersRepo.createUser({
      email: dto.email,
      name: dto.name,
    });
    if (userResult.isErr) {
      throw userResult.error;
    }

    const empResult = await this.employeeRepo.createEmployee({
      externalId: userResult.value.externalId,
      role: EmployeeRole.STAFF,
      homeTimezone: dto.homeTimezone,
      desiredHoursPerWeek: dto.desiredHoursPerWeek,
      desiredHoursNote: dto.desiredHoursNote,
    });
    if (empResult.isErr) {
      throw empResult.error;
    }

    const certResult = await this.locationCertRepo.certify(
      empResult.value.id,
      locationId,
    );
    if (certResult.isErr) {
      throw certResult.error;
    }

    if (dto.skillIds?.length) {
      for (const skillId of dto.skillIds) {
        const skillResult = await this.staffSkillRepo.assignSkill(
          empResult.value.id,
          skillId,
        );
        if (skillResult.isErr) {
          throw skillResult.error;
        }
      }
    }

    return {
      id: empResult.value.id,
      externalId: userResult.value.externalId,
      name: userResult.value.name,
      email: userResult.value.email,
      homeTimezone: empResult.value.homeTimezone,
      desiredHoursPerWeek: empResult.value.desiredHoursPerWeek,
      desiredHoursNote: empResult.value.desiredHoursNote,
      skills: [],
    };
  }

  private async assertManagerOfLocation(
    externalId: string,
    locationId: number,
  ): Promise<void> {
    const maybeEmployee = await this.employeeRepo.findByExternalId(externalId);
    if (maybeEmployee.isNothing) {
      throw new NotFoundException('Employee not found');
    }

    const isManager = await this.managerLocationRepo.isManagerOfLocation(
      maybeEmployee.value.id,
      locationId,
    );
    if (!isManager) {
      throw new ForbiddenException('You are not assigned to this location');
    }
  }
}
