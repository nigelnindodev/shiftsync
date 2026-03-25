import { ApiProperty } from '@nestjs/swagger';

export class LocationResponseDto {
  @ApiProperty({ description: 'Location ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Location name', example: 'Downtown' })
  name: string;

  @ApiProperty({ description: 'IANA timezone', example: 'America/New_York' })
  timezone: string;
}
