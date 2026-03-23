import {
  Body,
  Controller,
  Delete,
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
import { AssignmentService } from '../services/assignment.service';
import {
  CreateAssignmentDto,
  AssignmentResponseDto,
  EligibleStaffDto,
} from '../dto/assignment.dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller('shifts/:shiftId/skills/:slotId')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get('assignments')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'List assignments for a skill slot' })
  @ApiResponse({ status: 200, type: [AssignmentResponseDto] })
  async getAssignments(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
  ): Promise<AssignmentResponseDto[]> {
    return this.assignmentService.getAssignmentsForSlot(slotId);
  }

  @Get('eligible-staff')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({
    summary: 'Get constraint-filtered eligible staff for a slot',
  })
  @ApiResponse({ status: 200, type: [EligibleStaffDto] })
  async getEligibleStaff(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
  ): Promise<EligibleStaffDto[]> {
    return this.assignmentService.getEligibleStaff(shiftId, slotId);
  }

  @Post('assignments')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Assign a staff member to a skill slot' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async assignStaff(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() dto: CreateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    return this.assignmentService.assignStaff(
      shiftId,
      slotId,
      dto.staffMemberId,
    );
  }

  @Delete('assignments/:assignmentId')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Remove an assignment from a skill slot' })
  @ApiResponse({ status: 204 })
  async removeAssignment(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ): Promise<void> {
    return this.assignmentService.removeAssignment(
      shiftId,
      slotId,
      assignmentId,
    );
  }
}
