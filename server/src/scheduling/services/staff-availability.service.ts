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

  async getStaffAvailability(
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

  async upsertStaffAvailability(
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

  async deleteStaffAvailability(
    staffMemberId: number,
    availabilityId: number,
  ): Promise<void> {
    const maybeWindow =
      await this.availabilityRepo.findAvailabilityByIdAndStaffMember(
        availabilityId,
        staffMemberId,
      );

    if (maybeWindow.isNothing) {
      throw new NotFoundException('Availability window not found');
    }

    const result =
      await this.availabilityRepo.deleteAvailability(availabilityId);

    if (result.isErr) {
      this.logger.error('Failed to delete availability', result.error);
      throw new InternalServerErrorException('Failed to delete availability');
    }
  }

  async getStaffExceptions(
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

  async upsertStaffException(
    staffMemberId: number,
    dto: UpsertExceptionDto,
  ): Promise<StaffAvailabilityExceptionResponseDto> {
    if (dto.wallStartTime && dto.wallEndTime) {
      this.validateTimeRange(dto.wallStartTime, dto.wallEndTime);
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

  async deleteStaffException(
    staffMemberId: number,
    exceptionId: number,
  ): Promise<void> {
    const maybeException =
      await this.availabilityRepo.findExceptionByIdAndStaffMember(
        exceptionId,
        staffMemberId,
      );

    if (maybeException.isNothing) {
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
