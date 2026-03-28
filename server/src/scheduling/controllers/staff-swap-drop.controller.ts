import {
  Body,
  Controller,
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
import { AssignmentService } from '../services/assignment.service';
import { RequestSwapDto } from '../dto/assignment.dto';
import { PendingApprovalDto } from '../dto/pending-approval.dto';

@ApiTags('staff-swap-drop')
@ApiBearerAuth()
@Controller('staff/me/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffSwapDropController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get('swap-drop-requests')
  @Roles(EmployeeRole.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get pending swap/drop requests relevant to the staff member',
  })
  @ApiResponse({ status: 200, type: [PendingApprovalDto] })
  async getStaffSwapDropRequests(
    @Req() req: Request,
  ): Promise<PendingApprovalDto[]> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.getStaffPendingRequests(employee.id);
  }

  @Post(':assignmentId/swap')
  @Roles(EmployeeRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Request to swap a shift with another staff member',
  })
  @ApiResponse({ status: 204 })
  async requestSwap(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: RequestSwapDto,
    @Req() req: Request,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.requestSwap(
      assignmentId,
      dto.targetStaffMemberId,
      employee.id,
    );
  }

  @Post(':assignmentId/swap/accept')
  @Roles(EmployeeRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept a swap request' })
  @ApiResponse({ status: 204 })
  async acceptSwap(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Req() req: Request,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.acceptSwap(assignmentId, employee.id);
  }

  @Post(':assignmentId/drop')
  @Roles(EmployeeRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Offer a shift for drop' })
  @ApiResponse({ status: 204 })
  async requestDrop(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Req() req: Request,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.requestDrop(assignmentId, employee.id);
  }

  @Post(':assignmentId/drop/claim')
  @Roles(EmployeeRole.STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Claim a dropped shift' })
  @ApiResponse({ status: 204 })
  async claimDrop(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Req() req: Request,
  ): Promise<void> {
    const employee = req['employee'] as Employee;
    return this.assignmentService.claimDrop(assignmentId, employee.id);
  }
}
