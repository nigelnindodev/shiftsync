import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { ApprovalsQueryDto } from '../dto/approvals-query.dto';
import { PendingApprovalDto } from '../dto/pending-approval.dto';

@ApiTags('approvals')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get('pending-approvals')
  @Roles(EmployeeRole.MANAGER, EmployeeRole.ADMIN)
  @ApiOperation({
    summary: 'Get pending swap/drop approvals for a location',
  })
  @ApiResponse({ status: 200, type: [PendingApprovalDto] })
  async getPendingApprovals(
    @Query() query: ApprovalsQueryDto,
  ): Promise<PendingApprovalDto[]> {
    return this.assignmentService.getPendingApprovalsForLocation(
      query.locationId,
    );
  }
}
