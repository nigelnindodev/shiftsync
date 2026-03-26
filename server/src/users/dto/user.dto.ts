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
import { EmployeeRole } from '../user.types';
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

export class CreateEmployeeInput {
  @IsUUID()
  @IsNotEmpty()
  externalId: string;

  @IsEnum(EmployeeRole)
  role: EmployeeRole;

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

export class UpdateEmployeeDto {
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

export class UpdateUserDto extends UpdateEmployeeDto {
  @IsUUID()
  @IsNotEmpty()
  externalId: string;
}

export class EmployeeDto {
  @Expose()
  id: number;

  @Expose()
  externalId: string;

  @Expose()
  @ApiProperty({ enum: EmployeeRole })
  role: EmployeeRole;

  @Expose()
  homeTimezone?: string;

  @Expose()
  desiredHoursPerWeek?: number;

  @Expose()
  desiredHoursNote?: string;
}

@Exclude()
export class ExternalEmployeeDetailsDto {
  @Expose()
  externalId: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeDto)
  employee?: EmployeeDto | null;
}
