import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
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
@Controller('staff/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffAvailabilityController {
  constructor(
    private readonly staffAvailabilityService: StaffAvailabilityService,
  ) {}

  @Get(':staffId')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get staff recurring availability windows' })
  @ApiResponse({ status: 200, type: [StaffAvailabilityResponseDto] })
  async getStaffAvailability(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Req() req: Request,
  ): Promise<StaffAvailabilityResponseDto[]> {
    const employee = req['employee'] as Employee;
    if (employee.role === EmployeeRole.STAFF && employee.id !== staffId) {
      throw new ForbiddenException(
        'Staff can only view their own availability',
      );
    }
    return this.staffAvailabilityService.getStaffAvailability(staffId);
  }

  @Put()
  @Roles(EmployeeRole.STAFF)
  @ApiOperation({ summary: 'Upsert a recurring availability window' })
  @ApiResponse({ status: 200, type: StaffAvailabilityResponseDto })
  async upsertStaffAvailability(
    @Req() req: Request,
    @Body() dto: UpsertAvailabilityDto,
  ): Promise<StaffAvailabilityResponseDto> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.upsertStaffAvailability(
      employee.id,
      dto,
    );
  }

  @Delete(':availabilityId')
  @Roles(EmployeeRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a recurring availability window' })
  @ApiResponse({ status: 204 })
  async deleteStaffAvailability(
    @Req() req: Request,
    @Param('availabilityId', ParseIntPipe) availabilityId: number,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.deleteStaffAvailability(
      employee.id,
      availabilityId,
    );
  }

  @Get(':staffId/exceptions')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get availability exceptions for a date range' })
  @ApiResponse({
    status: 200,
    type: [StaffAvailabilityExceptionResponseDto],
  })
  async getStaffExceptions(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Req() req: Request,
    @Query() query: AvailabilityExceptionsQueryDto,
  ): Promise<StaffAvailabilityExceptionResponseDto[]> {
    const employee = req['employee'] as Employee;
    if (employee.role === EmployeeRole.STAFF && employee.id !== staffId) {
      throw new ForbiddenException(
        'Staff can only view their own availability',
      );
    }
    return this.staffAvailabilityService.getStaffExceptions(staffId, query);
  }

  @Put('exceptions')
  @Roles(EmployeeRole.STAFF)
  @ApiOperation({ summary: 'Upsert a one-off availability exception' })
  @ApiResponse({
    status: 200,
    type: StaffAvailabilityExceptionResponseDto,
  })
  async upsertStaffException(
    @Req() req: Request,
    @Body() dto: UpsertExceptionDto,
  ): Promise<StaffAvailabilityExceptionResponseDto> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.upsertStaffException(employee.id, dto);
  }

  @Delete('exceptions/:exceptionId')
  @Roles(EmployeeRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an availability exception' })
  @ApiResponse({ status: 204 })
  async deleteStaffException(
    @Req() req: Request,
    @Param('exceptionId', ParseIntPipe) exceptionId: number,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.staffAvailabilityService.deleteStaffException(
      employee.id,
      exceptionId,
    );
  }
}
