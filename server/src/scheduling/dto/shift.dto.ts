import {
  IsArray,
  IsDateString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ShiftSkillSlotDto {
  @ApiProperty({ description: 'Skill ID', example: 1 })
  @IsInt()
  skillId: number;

  @ApiProperty({
    description: 'Number of staff needed',
    example: 2,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  headcount: number;
}

export class CreateShiftDto {
  @ApiProperty({ description: 'Location ID', example: 1 })
  @IsInt()
  locationId: number;

  @ApiProperty({
    description: 'Shift start time (ISO 8601 UTC)',
    example: '2026-03-24T09:00:00Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Shift end time (ISO 8601 UTC)',
    example: '2026-03-24T17:00:00Z',
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: 'Skill slots with headcount',
    type: [ShiftSkillSlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftSkillSlotDto)
  skills: ShiftSkillSlotDto[];
}

export class ShiftSkillSlotResponseDto {
  id: number;
  skillId: number;
  skillName: string;
  headcount: number;
  assignedCount: number;
}

export class ShiftResponseDto {
  id: number;
  locationId: number;
  startTime: Date;
  endTime: Date;
  state: string;
  skills: ShiftSkillSlotResponseDto[];
}
