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
@Controller('shifts/:shiftId/skills/:slotId/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get existing assignments for a skill slot' })
  async getAssignments(@Param('slotId', ParseIntPipe) slotId: number) {
    return this.assignmentService.getAssignmentsForSlot(slotId);
  }

  @Get('eligible-staff')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Get staff members eligible for this slot' })
  @ApiResponse({ status: 200, type: [EligibleStaffDto] })
  async getEligibleStaff(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
  ) {
    return this.assignmentService.getEligibleStaff(shiftId, slotId);
  }

  @Post()
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Assign a staff member to a slot' })
  @ApiResponse({ status: 201, type: AssignmentResponseDto })
  async assignStaff(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentService.assignStaff(
      shiftId,
      slotId,
      dto.staffMemberId,
    );
  }

  @Delete(':assignmentId')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Remove an assignment' })
  async removeAssignment(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
  ) {
    return this.assignmentService.removeAssignment(
      shiftId,
      slotId,
      assignmentId,
    );
  }
}
