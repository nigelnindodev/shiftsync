import { IsInt } from 'class-validator';
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
