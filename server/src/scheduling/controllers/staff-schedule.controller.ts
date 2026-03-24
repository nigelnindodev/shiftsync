import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
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
import { StaffScheduleService } from '../services/staff-schedule.service';
import {
  StaffScheduleQueryDto,
  StaffScheduleEntryDto,
} from '../dto/staff-schedule.dto';

@ApiTags('staff-schedule')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffScheduleController {
  constructor(private readonly staffScheduleService: StaffScheduleService) {}

  @Get('me/schedule')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get the authenticated staff member schedule' })
  @ApiResponse({ status: 200, type: [StaffScheduleEntryDto] })
  async getMySchedule(
    @Req() req: Request,
    @Query() query: StaffScheduleQueryDto,
  ): Promise<StaffScheduleEntryDto[]> {
    const employee = req['employee'] as Employee;
    return this.staffScheduleService.getStaffSchedule(
      employee.id,
      query.startDate,
      query.endDate,
    );
  }

  @Get(':staffId/schedule')
  @Roles(EmployeeRole.STAFF, EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get a staff member schedule' })
  @ApiResponse({ status: 200, type: [StaffScheduleEntryDto] })
  async getStaffSchedule(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Req() req: Request,
    @Query() query: StaffScheduleQueryDto,
  ): Promise<StaffScheduleEntryDto[]> {
    const employee = req['employee'] as Employee;

    // Staff can only view their own schedule
    if (employee.role === EmployeeRole.STAFF && employee.id !== staffId) {
      throw new ForbiddenException('Staff can only view their own schedule');
    }

    return this.staffScheduleService.getStaffSchedule(
      staffId,
      query.startDate,
      query.endDate,
    );
  }
}
