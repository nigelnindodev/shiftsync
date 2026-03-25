import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PendingApprovalDto {
  @ApiProperty({ description: 'Assignment ID', example: 1 })
  assignmentId: number;

  @ApiProperty({ description: 'Staff member ID', example: 7 })
  staffMemberId: number;

  @ApiProperty({ description: 'Staff member name', example: 'John Bartender' })
  staffName: string;

  @ApiProperty({
    description: 'Assignment state',
    example: 'SWAP_PENDING_APPROVAL',
  })
  state: string;

  @ApiProperty({ description: 'Shift ID', example: 1 })
  shiftId: number;

  @ApiProperty({ description: 'Shift start date', example: '2026-03-25' })
  shiftDate: string;

  @ApiProperty({ description: 'Shift time range', example: '09:00 - 17:00' })
  shiftTime: string;

  @ApiProperty({ description: 'Location ID', example: 1 })
  locationId: number;

  @ApiProperty({ description: 'Location name', example: 'Downtown' })
  locationName: string;

  @ApiProperty({ description: 'Skill name', example: 'bartender' })
  skillName: string;

  @ApiPropertyOptional({
    description: 'Swap target name (only for swaps)',
    example: 'Sarah Server',
  })
  swapTargetName: string | null;
}
