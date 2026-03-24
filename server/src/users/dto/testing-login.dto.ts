import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestingLoginDto {
  @ApiProperty({
    description: 'User email or externalId',
    example: 'john@coastaleats.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class TestingLoginResponseDto {
  @ApiProperty()
  externalId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['ADMIN', 'MANAGER', 'STAFF'] })
  role: string;

  @ApiProperty({ required: false })
  homeTimezone?: string;
}

export class TestingEmployeeDto {
  @ApiProperty()
  externalId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['ADMIN', 'MANAGER', 'STAFF'] })
  role: string;

  @ApiProperty({ required: false })
  homeTimezone?: string;
}
