import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StaffAvailabilityRepository } from '../../staffing/repositories';
import {
  UpsertAvailabilityDto,
  UpsertExceptionDto,
  AvailabilityExceptionsQueryDto,
  StaffAvailabilityResponseDto,
  StaffAvailabilityExceptionResponseDto,
} from '../dto/staff-availability.dto';

@Injectable()
export class StaffAvailabilityService {
  private readonly logger = new Logger(StaffAvailabilityService.name);

  constructor(private readonly availabilityRepo: StaffAvailabilityRepository) {}

  async getMyAvailability(
    staffMemberId: number,
  ): Promise<StaffAvailabilityResponseDto[]> {
    const windows =
      await this.availabilityRepo.findByStaffMember(staffMemberId);

    return windows.map((w) => ({
      id: w.id,
      dayOfWeek: w.dayOfWeek,
      wallStartTime: w.wallStartTime,
      wallEndTime: w.wallEndTime,
    }));
  }

  async upsertAvailability(
    staffMemberId: number,
    dto: UpsertAvailabilityDto,
  ): Promise<StaffAvailabilityResponseDto> {
    this.validateTimeRange(dto.wallStartTime, dto.wallEndTime);

    const result = await this.availabilityRepo.upsertAvailability(
      staffMemberId,
      dto.dayOfWeek,
      dto.wallStartTime,
      dto.wallEndTime,
    );

    if (result.isErr) {
      this.logger.error('Failed to upsert availability', result.error);
      throw new InternalServerErrorException('Failed to save availability');
    }

    return {
      id: result.value.id,
      dayOfWeek: result.value.dayOfWeek,
      wallStartTime: result.value.wallStartTime,
      wallEndTime: result.value.wallEndTime,
    };
  }

  async deleteAvailability(
    staffMemberId: number,
    availabilityId: number,
  ): Promise<void> {
    const windows =
      await this.availabilityRepo.findByStaffMember(staffMemberId);
    const window = windows.find((w) => w.id === availabilityId);

    if (!window) {
      throw new NotFoundException('Availability window not found');
    }

    const result =
      await this.availabilityRepo.deleteAvailability(availabilityId);

    if (result.isErr) {
      this.logger.error('Failed to delete availability', result.error);
      throw new InternalServerErrorException('Failed to delete availability');
    }
  }

  async getExceptions(
    staffMemberId: number,
    query: AvailabilityExceptionsQueryDto,
  ): Promise<StaffAvailabilityExceptionResponseDto[]> {
    const exceptions = await this.availabilityRepo.findExceptionsForDateRange(
      staffMemberId,
      query.startDate,
      query.endDate,
    );

    return exceptions.map((e) => ({
      id: e.id,
      date: e.date,
      isAvailable: e.isAvailable,
      wallStartTime: e.wallStartTime,
      wallEndTime: e.wallEndTime,
    }));
  }

  async upsertException(
    staffMemberId: number,
    dto: UpsertExceptionDto,
  ): Promise<StaffAvailabilityExceptionResponseDto> {
    if (dto.wallStartTime || dto.wallEndTime) {
      this.validateTimeRange(dto.wallStartTime!, dto.wallEndTime!);
    }

    const result = await this.availabilityRepo.upsertException(
      staffMemberId,
      dto.date,
      dto.isAvailable,
      dto.wallStartTime,
      dto.wallEndTime,
    );

    if (result.isErr) {
      this.logger.error('Failed to upsert exception', result.error);
      throw new BadRequestException(result.error.message);
    }

    return {
      id: result.value.id,
      date: result.value.date,
      isAvailable: result.value.isAvailable,
      wallStartTime: result.value.wallStartTime,
      wallEndTime: result.value.wallEndTime,
    };
  }

  async deleteException(
    staffMemberId: number,
    exceptionId: number,
  ): Promise<void> {
    const exceptions = await this.availabilityRepo.findExceptionsForDateRange(
      staffMemberId,
      '1970-01-01',
      '9999-12-31',
    );
    const exception = exceptions.find((e) => e.id === exceptionId);

    if (!exception) {
      throw new NotFoundException('Availability exception not found');
    }

    const result = await this.availabilityRepo.deleteException(exceptionId);

    if (result.isErr) {
      this.logger.error('Failed to delete exception', result.error);
      throw new InternalServerErrorException('Failed to delete exception');
    }
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('wallStartTime must be before wallEndTime');
    }
  }
}
