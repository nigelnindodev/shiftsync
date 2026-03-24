import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EmployeeRole } from '../user.types';

export class TestingLoginDto {
  @ApiProperty({
    description: 'User email or externalId',
    example: 'john@coastaleats.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;
}

export class TestingEmployeeDto {
  @ApiProperty()
  externalId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: EmployeeRole })
  role: string;

  @ApiProperty({ required: false })
  homeTimezone?: string;
}

export class TestingLoginResponseDto extends TestingEmployeeDto {}
