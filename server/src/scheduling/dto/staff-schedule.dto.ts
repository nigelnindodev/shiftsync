import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StaffScheduleQueryDto {
  @ApiProperty({
    description: 'Start of date range (ISO 8601)',
    example: '2026-03-24',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End of date range (ISO 8601)',
    example: '2026-03-30',
  })
  @IsDateString()
  endDate: string;
}

export class StaffScheduleEntryDto {
  @ApiProperty({ description: 'Assignment ID', example: 1 })
  assignmentId: number;

  @ApiProperty({ description: 'Shift ID', example: 1 })
  shiftId: number;

  @ApiProperty({ description: 'Assignment state', example: 'ASSIGNED' })
  state: string;

  @ApiProperty({
    description: 'Shift start time (UTC)',
    example: '2026-03-25T10:00:00Z',
  })
  startTime: Date;

  @ApiProperty({
    description: 'Shift end time (UTC)',
    example: '2026-03-25T18:00:00Z',
  })
  endTime: Date;

  @ApiProperty({ description: 'Location ID', example: 1 })
  locationId: number;

  @ApiProperty({ description: 'Location name', example: 'Downtown' })
  locationName: string;

  @ApiProperty({
    description: 'Location timezone',
    example: 'America/New_York',
  })
  locationTimezone: string;

  @ApiProperty({ description: 'Skill ID', example: 1 })
  skillId: number;

  @ApiProperty({ description: 'Skill name', example: 'Bartender' })
  skillName: string;
}
