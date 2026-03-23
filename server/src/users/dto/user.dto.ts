import { Exclude, Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../user.types';
import { ApiProperty } from '@nestjs/swagger';

@ValidatorConstraint({ async: false })
export class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
  validate(timezone: string) {
    if (typeof timezone !== 'string') return false;
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'homeTimezone must be a valid IANA timezone identifier';
  }
}

export function IsIanaTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIanaTimezoneConstraint,
    });
  };
}

export class GetOrCreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class CreateUserProfileInput {
  @IsUUID()
  @IsNotEmpty()
  externalId: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsIanaTimezone()
  homeTimezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  desiredHoursPerWeek?: number;

  @IsOptional()
  @IsString()
  desiredHoursNote?: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsIanaTimezone()
  homeTimezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
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
