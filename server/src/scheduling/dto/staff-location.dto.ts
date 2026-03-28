import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class StaffLocationDto {
  @ApiProperty({ description: 'Employee ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'External user ID' })
  externalId: string;

  @ApiProperty({ description: 'Full name', example: 'Alice Johnson' })
  name: string;

  @ApiProperty({ description: 'Email address', example: 'alice@example.com' })
  email: string;

  @ApiProperty({ description: 'IANA timezone', example: 'America/New_York' })
  homeTimezone: string;

  @ApiPropertyOptional({
    description: 'Desired hours per week',
    example: 40,
  })
  desiredHoursPerWeek?: number;

  @ApiPropertyOptional({ description: 'Hours note' })
  desiredHoursNote?: string;

  @ApiProperty({
    description: 'Skill names',
    example: ['Bartender', 'Server'],
    type: [String],
  })
  skills: string[];
}

export class CreateStaffDto {
  @ApiProperty({ description: 'Email address', example: 'alice@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Full name', example: 'Alice Johnson' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'IANA timezone', example: 'America/New_York' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['America/New_York', 'America/Los_Angeles'])
  homeTimezone: string;

  @ApiPropertyOptional({
    description: 'Desired hours per week',
    example: 40,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  desiredHoursPerWeek?: number;

  @ApiPropertyOptional({ description: 'Hours note' })
  @IsOptional()
  @IsString()
  desiredHoursNote?: string;

  @ApiPropertyOptional({
    description: 'Skill IDs to assign',
    example: [1, 2],
    type: [Number],
  })
  @IsOptional()
  @IsInt({ each: true })
  skillIds?: number[];
}
