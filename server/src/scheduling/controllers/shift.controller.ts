import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
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
import { ShiftService } from '../services/shift.service';
import { SchedulingReferenceService } from '../services/scheduling-reference.service';
import { CreateShiftDto, ShiftResponseDto } from '../dto/shift.dto';
import { ShiftQueryDto } from '../dto/shift-query.dto';
import { LocationResponseDto } from '../dto/location-response.dto';
import { SkillResponseDto } from '../dto/skill-response.dto';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftController {
  constructor(
    private readonly shiftService: ShiftService,
    private readonly referenceService: SchedulingReferenceService,
  ) {}

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

  @Get()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'List shifts by location and date range' })
  @ApiResponse({ status: 200, type: [ShiftResponseDto] })
  async listShifts(@Query() query: ShiftQueryDto) {
    return this.shiftService.getShiftsByLocationAndDateRange(
      query.locationId,
      query.startDate,
      query.endDate,
    );
  }

  @Get(':shiftId')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get shift detail by ID' })
  @ApiResponse({ status: 200, type: ShiftResponseDto })
  async getShift(@Param('shiftId', ParseIntPipe) shiftId: number) {
    return this.shiftService.getShiftById(shiftId);
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Create a new shift with skill slots' })
  @ApiResponse({ status: 201, type: ShiftResponseDto })
  async createShift(@Body() dto: CreateShiftDto, @Req() req: Request) {
    const employee = req['employee'] as Employee;
    return this.shiftService.createShift(
      dto.locationId,
      dto.startTime,
      dto.endTime,
      dto.skills,
      employee.id,
    );
  }

  @Delete(':shiftId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a shift' })
  @ApiResponse({ status: 204 })
  async cancelShift(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Req() req: Request,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.shiftService.cancelShift(shiftId, employee.id);
  }

  @Get(':shiftId/skills')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get skill slots and fill state for a shift' })
  async getShiftSkills(@Param('shiftId', ParseIntPipe) shiftId: number) {
    return this.shiftService.getShiftSkillSlots(shiftId);
  }
}
