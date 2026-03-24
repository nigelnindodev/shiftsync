import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import { AssignmentService } from '../services/assignment.service';
import {
  CreateAssignmentDto,
  AssignmentResponseDto,
  EligibleStaffDto,
  ApproveSwapDropDto,
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
    return this.assignmentService.getAssignmentsForShiftAndSlot(
      shiftId,
      slotId,
    );
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
    @Req() req: Request,
  ): Promise<AssignmentResponseDto> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.assignStaff(
      shiftId,
      slotId,
      dto.staffMemberId,
      employee.id,
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
    @Req() req: Request,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.removeAssignment(
      shiftId,
      slotId,
      assignmentId,
      employee.id,
    );
  }

  @Put('assignments/:assignmentId/swap-drop')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a pending swap/drop request' })
  @ApiResponse({ status: 200 })
  async approveSwapDrop(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: ApproveSwapDropDto,
    @Req() req: Request,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.approveSwapDrop(
      assignmentId,
      slotId,
      employee.id,
      dto.approved,
    );
  }
}
