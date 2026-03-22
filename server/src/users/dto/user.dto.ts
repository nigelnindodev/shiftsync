import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../user.types';
import { ApiProperty } from '@nestjs/swagger';

export class GetOrCreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class CreateUserProfileInput {
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  homeTimezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  desiredHoursPerWeek?: number;

  @IsOptional()
  @IsString()
  desiredHoursNote?: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  homeTimezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  desiredHoursPerWeek?: number;

  @IsOptional()
  @IsString()
  desiredHoursNote?: string;
}

export class UserProfileDto {
  @Expose()
  externalId: string;

  @Expose()
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @Expose()
  homeTimezone?: string;

  @Expose()
  desiredHoursPerWeek?: number;

  @Expose()
  desiredHoursNote?: string;
}

@Exclude()
export class ExternalUserDetailsDto {
  @Expose()
  externalId: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto | null;
}
