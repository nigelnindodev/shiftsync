import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AssignmentRepository } from '../repositories';
import { StaffScheduleEntryDto } from '../dto/staff-schedule.dto';

@Injectable()
export class StaffScheduleService {
  private readonly logger = new Logger(StaffScheduleService.name);

  constructor(private readonly assignmentRepo: AssignmentRepository) {}

  async getMySchedule(
    staffMemberId: number,
    startDate: string,
    endDate: string,
  ): Promise<StaffScheduleEntryDto[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start >= end) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const assignments =
      await this.assignmentRepo.findByStaffMemberAndDateRangeWithDetails(
        staffMemberId,
        start,
        end,
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
