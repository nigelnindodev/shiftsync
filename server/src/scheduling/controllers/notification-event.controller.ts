import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  SchedulingEventPatterns,
  AssignmentCreatedEvent,
  AssignmentRemovedEvent,
  SwapRequestedEvent,
  SwapAcceptedEvent,
  SwapApprovedEvent,
  SwapRejectedEvent,
  DropRequestedEvent,
  DropClaimedEvent,
  DropApprovedEvent,
  DropRejectedEvent,
} from '../events/scheduling-events';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationGateway } from '../services/notification-gateway.service';
import { ManagerLocationRepository } from '../../staffing/repositories/manager-location.repository';
import { ShiftRepository } from '../repositories/shift.repository';
import { AssignmentRepository } from '../repositories/assignment.repository';
import { EmployeeRepository } from '../../users/employee.repository';
import { Notification } from '../entities/notification.entity';

@Controller()
export class NotificationEventController {
  private readonly logger = new Logger(NotificationEventController.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly gateway: NotificationGateway,
    private readonly managerLocationRepo: ManagerLocationRepository,
    private readonly shiftRepo: ShiftRepository,
    private readonly assignmentRepo: AssignmentRepository,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  private async getActorName(
    actorId: number | undefined,
  ): Promise<string | undefined> {
    if (!actorId) return undefined;
    const maybeEmployee = await this.employeeRepo.findByIdWithUser(actorId);
    if (maybeEmployee.isNothing) return undefined;
    return maybeEmployee.value.user?.name;
  }

  private async notify(
    recipientId: number,
    data: {
      actorId?: number;
      eventType: string;
      message: string;
      link?: string;
    },
  ): Promise<void> {
    this.logger.log(
      `Received ${data.eventType} → notifying employee ${recipientId}`,
    );
    try {
      const notification = await this.notificationRepo.create({
        recipientId,
        ...data,
      });
      this.gateway.notify(recipientId, notification);
    } catch (err) {
      this.logger.error(
        `Failed to create notification for recipient ${recipientId}`,
        err,
      );
    }
  }

  @EventPattern(SchedulingEventPatterns.ASSIGNMENT_CREATED)
  async onAssignmentCreated(
    @Payload() payload: AssignmentCreatedEvent,
  ): Promise<void> {
    const actorName = await this.getActorName(payload.assignedByManagerId);
    const message = actorName
      ? `Manager ${actorName} assigned you to a shift`
      : "You've been assigned to a shift";

    await this.notify(payload.staffMemberId, {
      actorId: payload.assignedByManagerId,
      eventType: SchedulingEventPatterns.ASSIGNMENT_CREATED,
      message,
      link: `/staff/schedule/${payload.shiftId}`,
    });
  }

  @EventPattern(SchedulingEventPatterns.ASSIGNMENT_REMOVED)
  async onAssignmentRemoved(
    @Payload() payload: AssignmentRemovedEvent,
  ): Promise<void> {
    const actorName = await this.getActorName(payload.removedByManagerId);
    const message = actorName
      ? `Manager ${actorName} removed you from a shift`
      : "You've been removed from a shift";

    await this.notify(payload.staffMemberId, {
      actorId: payload.removedByManagerId,
      eventType: SchedulingEventPatterns.ASSIGNMENT_REMOVED,
      message,
      link: `/staff/schedule/${payload.shiftId}`,
    });
  }

  @EventPattern(SchedulingEventPatterns.SWAP_REQUESTED)
  async onSwapRequested(@Payload() payload: SwapRequestedEvent): Promise<void> {
    const actorName = await this.getActorName(payload.staffMemberId);
    const message = actorName
      ? `${actorName} requested a swap with you`
      : 'A swap request has been sent to you';

    await this.notify(payload.targetStaffMemberId, {
      actorId: payload.staffMemberId,
      eventType: SchedulingEventPatterns.SWAP_REQUESTED,
      message,
      link: '/staff/swap-requests',
    });
  }

  @EventPattern(SchedulingEventPatterns.SWAP_ACCEPTED)
  async onSwapAccepted(@Payload() payload: SwapAcceptedEvent): Promise<void> {
    const original = await this.assignmentRepo.findById(
      payload.originalAssignmentId,
    );
    if (!original) return;

    const actorName = await this.getActorName(payload.staffMemberId);
    const message = actorName
      ? `${actorName} accepted your swap request`
      : 'Your swap request was accepted';

    await this.notify(original.staffMemberId, {
      actorId: payload.staffMemberId,
      eventType: SchedulingEventPatterns.SWAP_ACCEPTED,
      message,
      link: '/staff/swap-requests',
    });
  }

  @EventPattern(SchedulingEventPatterns.SWAP_APPROVED)
  async onSwapApproved(@Payload() payload: SwapApprovedEvent): Promise<void> {
    const [original, partner] = await Promise.all([
      this.assignmentRepo.findById(payload.originalAssignmentId),
      this.assignmentRepo.findById(payload.newAssignmentId),
    ]);

    const staffIds = new Set<number>();
    if (original) staffIds.add(original.staffMemberId);
    if (partner) staffIds.add(partner.staffMemberId);

    const actorName = await this.getActorName(payload.approvedByManagerId);
    const message = actorName
      ? `Manager ${actorName} approved your swap`
      : 'Your swap was approved by a manager';

    for (const staffId of staffIds) {
      await this.notify(staffId, {
        actorId: payload.approvedByManagerId,
        eventType: SchedulingEventPatterns.SWAP_APPROVED,
        message,
        link: '/staff/swap-requests',
      });
    }
  }

  @EventPattern(SchedulingEventPatterns.SWAP_REJECTED)
  async onSwapRejected(@Payload() payload: SwapRejectedEvent): Promise<void> {
    const [original, partner] = await Promise.all([
      this.assignmentRepo.findById(payload.originalAssignmentId),
      this.assignmentRepo.findById(payload.newAssignmentId),
    ]);

    const staffIds = new Set<number>();
    if (original) staffIds.add(original.staffMemberId);
    if (partner) staffIds.add(partner.staffMemberId);

    const actorName = await this.getActorName(payload.rejectedByManagerId);
    const message = actorName
      ? `Manager ${actorName} rejected your swap`
      : 'Your swap was rejected';

    for (const staffId of staffIds) {
      await this.notify(staffId, {
        actorId: payload.rejectedByManagerId,
        eventType: SchedulingEventPatterns.SWAP_REJECTED,
        message,
        link: '/staff/swap-requests',
      });
    }
  }

  @EventPattern(SchedulingEventPatterns.DROP_REQUESTED)
  async onDropRequested(@Payload() payload: DropRequestedEvent): Promise<void> {
    const maybeShift = await this.shiftRepo.findById(payload.shiftId);
    if (maybeShift.isNothing) return;

    const managers = await this.managerLocationRepo.findManagersByLocation(
      maybeShift.value.locationId,
    );

    const actorName = await this.getActorName(payload.staffMemberId);
    const message = actorName
      ? `${actorName} requested to drop a shift`
      : 'A staff member requested to drop a shift';

    for (const ml of managers) {
      await this.notify(ml.managerId, {
        actorId: payload.staffMemberId,
        eventType: SchedulingEventPatterns.DROP_REQUESTED,
        message,
        link: '/manager/approvals',
      });
    }
  }

  @EventPattern(SchedulingEventPatterns.DROP_CLAIMED)
  async onDropClaimed(@Payload() payload: DropClaimedEvent): Promise<void> {
    const original = await this.assignmentRepo.findById(
      payload.originalAssignmentId,
    );
    if (!original) return;

    const actorName = await this.getActorName(payload.claimedByStaffId);
    const message = actorName
      ? `${actorName} claimed your drop request`
      : 'Your drop request was claimed';

    await this.notify(original.staffMemberId, {
      actorId: payload.claimedByStaffId,
      eventType: SchedulingEventPatterns.DROP_CLAIMED,
      message,
      link: '/staff/swap-requests',
    });
  }

  @EventPattern(SchedulingEventPatterns.DROP_APPROVED)
  async onDropApproved(@Payload() payload: DropApprovedEvent): Promise<void> {
    const [original, partner] = await Promise.all([
      this.assignmentRepo.findById(payload.originalAssignmentId),
      this.assignmentRepo.findById(payload.newAssignmentId),
    ]);

    const staffIds = new Set<number>();
    if (original) staffIds.add(original.staffMemberId);
    if (partner) staffIds.add(partner.staffMemberId);

    const actorName = await this.getActorName(payload.approvedByManagerId);
    const message = actorName
      ? `Manager ${actorName} approved your drop`
      : 'Your drop was approved';

    for (const staffId of staffIds) {
      await this.notify(staffId, {
        actorId: payload.approvedByManagerId,
        eventType: SchedulingEventPatterns.DROP_APPROVED,
        message,
        link: '/staff/swap-requests',
      });
    }
  }

  @EventPattern(SchedulingEventPatterns.DROP_REJECTED)
  async onDropRejected(@Payload() payload: DropRejectedEvent): Promise<void> {
    const original = await this.assignmentRepo.findById(
      payload.originalAssignmentId,
    );
    if (!original) return;

    const actorName = await this.getActorName(payload.rejectedByManagerId);
    const message = actorName
      ? `Manager ${actorName} rejected your drop request`
      : 'Your drop request was rejected';

    await this.notify(original.staffMemberId, {
      actorId: payload.rejectedByManagerId,
      eventType: SchedulingEventPatterns.DROP_REJECTED,
      message,
      link: '/staff/swap-requests',
    });
  }
}
