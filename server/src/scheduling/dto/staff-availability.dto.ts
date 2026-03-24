import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../../staffing/entities/staff-availability.entity';

export class UpsertAvailabilityDto {
  @ApiProperty({
    description: 'Day of week',
    enum: DayOfWeek,
    example: DayOfWeek.MON,
  })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({
    description: 'Start time in local format (HH:MM)',
    example: '09:00',
  })
  @IsString()
  wallStartTime: string;

  @ApiProperty({
    description: 'End time in local format (HH:MM)',
    example: '17:00',
  })
  @IsString()
  wallEndTime: string;
}

export class UpsertExceptionDto {
  @ApiProperty({
    description: 'Date of exception (ISO 8601)',
    example: '2026-03-25',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Whether staff is available on this date',
    example: false,
  })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Start time in local format (HH:MM), required if isAvailable',
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  wallStartTime?: string;

  @ApiPropertyOptional({
    description: 'End time in local format (HH:MM), required if isAvailable',
    example: '15:00',
  })
  @IsOptional()
  @IsString()
  wallEndTime?: string;
}

export class AvailabilityExceptionsQueryDto {
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

export class StaffAvailabilityResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MON })
  dayOfWeek: string;

  @ApiProperty({ example: '09:00' })
  wallStartTime: string;

  @ApiProperty({ example: '17:00' })
  wallEndTime: string;
}

export class StaffAvailabilityExceptionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '2026-03-25' })
  date: string;

  @ApiProperty({ example: false })
  isAvailable: boolean;

  @ApiPropertyOptional({ example: '10:00' })
  wallStartTime?: string;

  @ApiPropertyOptional({ example: '15:00' })
  wallEndTime?: string;
}
