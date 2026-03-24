import { IsBoolean, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Staff member employee ID', example: 1 })
  @IsInt()
  staffMemberId: number;
}

export class AssignmentResponseDto {
  assignmentId: number;
  staffMemberId: number;
  staffName: string;
  state: string;
}

export class SlotAssignmentsResponseDto {
  slotId: number;
  skillId: number;
  skillName: string;
  headcount: number;
  assignedCount: number;
  assignments: AssignmentResponseDto[];
}

export class EligibleStaffDto {
  staffMemberId: number;
  name: string;
  hoursThisWeek: number;
  warnings: Array<{
    code: string;
    message: string;
  }>;
}

export class RequestSwapDto {
  @ApiProperty({ description: 'Target staff member to swap with', example: 2 })
  @IsInt()
  targetStaffMemberId: number;
}

export class ApproveSwapDropDto {
  @ApiProperty({ description: 'Whether to approve or reject', example: true })
  @IsBoolean()
  approved: boolean;
}
