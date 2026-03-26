import { Controller, Get, UseGuards } from '@nestjs/common';
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
import { ManagerLocationRepository } from '../repositories/manager-location.repository';
import { LocationResponseDto } from '../../scheduling/dto/location-response.dto';

@ApiTags('manager')
@ApiBearerAuth()
@Controller('manager')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
export class ManagerController {
  constructor(
    private readonly employeeRepo: EmployeeRepository,
    private readonly managerLocationRepo: ManagerLocationRepository,
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
}
