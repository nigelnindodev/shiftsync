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
  assignmentId: number;
  shiftId: number;
  state: string;

  startTime: Date;
  endTime: Date;

  locationId: number;
  locationName: string;
  locationTimezone: string;

  skillId: number;
  skillName: string;
}
