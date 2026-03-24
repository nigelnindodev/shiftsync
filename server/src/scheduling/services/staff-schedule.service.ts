import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { AssignmentRepository } from '../repositories';
import { StaffScheduleEntryDto } from '../dto/staff-schedule.dto';
import { ClockService } from '../../common/clock/clock.service';

@Injectable()
export class StaffScheduleService {
  private readonly logger = new Logger(StaffScheduleService.name);

  constructor(
    private readonly assignmentRepo: AssignmentRepository,
    private readonly clockService: ClockService,
  ) {}

  async getStaffSchedule(
    staffMemberId: number,
    startDate: string,
    endDate: string,
  ): Promise<StaffScheduleEntryDto[]> {
    const start = Temporal.PlainDate.from(startDate).toZonedDateTime('UTC');
    const end = Temporal.PlainDate.from(endDate).toZonedDateTime('UTC');

    if (Temporal.PlainDate.compare(startDate, endDate) > 0) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const assignments =
      await this.assignmentRepo.findByStaffMemberAndDateRangeWithDetails(
        staffMemberId,
        new Date(start.toInstant().toString()),
        new Date(
          end
            .withPlainTime({
              hour: 23,
              minute: 59,
              second: 59,
              millisecond: 999,
            })
            .toInstant()
            .toString(),
        ),
      );

    return assignments.map((a) => ({
      assignmentId: a.id,
      shiftId: a.shiftSkill.shiftId,
      state: a.state,
      startTime: a.shiftSkill.shift.startTime,
      endTime: a.shiftSkill.shift.endTime,
      locationId: a.shiftSkill.shift.location.id,
      locationName: a.shiftSkill.shift.location.name,
      locationTimezone: a.shiftSkill.shift.location.timezone,
      skillId: a.shiftSkill.skillId,
      skillName: a.shiftSkill.skill.name,
    }));
  }
}
