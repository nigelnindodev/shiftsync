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
import { CreateShiftDto, ShiftResponseDto } from '../dto/shift.dto';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

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
