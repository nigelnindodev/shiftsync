import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../security/guards/jwt-auth-guard';
import { RolesGuard } from '../../security/guards/roles.guard';
import { Roles } from '../../security/decorators/roles.decorator';
import { EmployeeRole } from '../../users/user.types';
import { Employee } from '../../users/entity/employee.entity';
import { StaffAvailabilityService } from '../services/staff-availability.service';
import {
  UpsertAvailabilityDto,
  UpsertExceptionDto,
  AvailabilityExceptionsQueryDto,
  StaffAvailabilityResponseDto,
  StaffAvailabilityExceptionResponseDto,
} from '../dto/staff-availability.dto';

@ApiTags('staff-availability')
@ApiBearerAuth()
@Controller('staff/me/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffAvailabilityController {
  constructor(
    private readonly staffAvailabilityService: StaffAvailabilityService,
  ) {}

  @Get()
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get staff recurring availability windows' })
  @ApiResponse({ status: 200, type: [StaffAvailabilityResponseDto] })
  async getMyAvailability(
    @Req() req: Request,
  ): Promise<StaffAvailabilityResponseDto[]> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.getMyAvailability(employee.id);
  }

  @Put()
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Upsert a recurring availability window' })
  @ApiResponse({ status: 200, type: StaffAvailabilityResponseDto })
  async upsertAvailability(
    @Req() req: Request,
    @Body() dto: UpsertAvailabilityDto,
  ): Promise<StaffAvailabilityResponseDto> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.upsertAvailability(employee.id, dto);
  }

  @Delete(':id')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Delete a recurring availability window' })
  @ApiResponse({ status: 204 })
  async deleteAvailability(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.deleteAvailability(employee.id, id);
  }

  @Get('exceptions')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get availability exceptions for a date range' })
  @ApiResponse({
    status: 200,
    type: [StaffAvailabilityExceptionResponseDto],
  })
  async getExceptions(
    @Req() req: Request,
    @Query() query: AvailabilityExceptionsQueryDto,
  ): Promise<StaffAvailabilityExceptionResponseDto[]> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.getExceptions(employee.id, query);
  }

  @Put('exceptions')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Upsert a one-off availability exception' })
  @ApiResponse({
    status: 200,
    type: StaffAvailabilityExceptionResponseDto,
  })
  async upsertException(
    @Req() req: Request,
    @Body() dto: UpsertExceptionDto,
  ): Promise<StaffAvailabilityExceptionResponseDto> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.upsertException(employee.id, dto);
  }

  @Delete('exceptions/:id')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Delete an availability exception' })
  @ApiResponse({ status: 204 })
  async deleteException(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.deleteException(employee.id, id);
  }
}
