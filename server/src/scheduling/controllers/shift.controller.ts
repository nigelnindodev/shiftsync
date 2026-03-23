import {
  Body,
  Controller,
  Get,
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
  async createShift(@Body() dto: CreateShiftDto) {
    return this.shiftService.createShift(
      dto.locationId,
      dto.startTime,
      dto.endTime,
      dto.skills,
    );
  }

  @Get(':shiftId/skills')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get skill slots and fill state for a shift' })
  async getShiftSkills(@Param('shiftId', ParseIntPipe) shiftId: number) {
    return this.shiftService.getShiftSkillSlots(shiftId);
  }
}
