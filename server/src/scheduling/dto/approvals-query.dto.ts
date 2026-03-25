import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ApprovalsQueryDto {
  @ApiProperty({ description: 'Location ID', example: 1 })
  @IsInt()
  @Type(() => Number)
  locationId: number;
}
