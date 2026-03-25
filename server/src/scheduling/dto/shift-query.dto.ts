import { IsDateString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ShiftQueryDto {
  @ApiProperty({ description: 'Location ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  locationId: number;

  @ApiProperty({
    description: 'Start of date range (ISO 8601)',
    example: '2026-03-23',
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
