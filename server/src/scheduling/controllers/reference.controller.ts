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
import { SchedulingReferenceService } from '../services/scheduling-reference.service';
import { LocationResponseDto } from '../dto/location-response.dto';
import { SkillResponseDto } from '../dto/skill-response.dto';

@ApiTags('reference')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferenceController {
  constructor(private readonly referenceService: SchedulingReferenceService) {}

  @Get('skills')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get all active skills' })
  @ApiResponse({ status: 200, type: [SkillResponseDto] })
  async getSkills(): Promise<SkillResponseDto[]> {
    return this.referenceService.getAllActiveSkills();
  }

  @Get('locations')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get all locations' })
  @ApiResponse({ status: 200, type: [LocationResponseDto] })
  async getLocations(): Promise<LocationResponseDto[]> {
    return this.referenceService.getAllLocations();
  }
}
