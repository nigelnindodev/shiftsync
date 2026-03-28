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
  ) {}

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
    await this.notify(payload.staffMemberId, {
      actorId: payload.assignedByManagerId,
      eventType: SchedulingEventPatterns.ASSIGNMENT_CREATED,
      message: "You've been assigned to a shift",
      link: `/staff/schedule/${payload.shiftId}`,
    });
  }

  @EventPattern(SchedulingEventPatterns.ASSIGNMENT_REMOVED)
  async onAssignmentRemoved(
    @Payload() payload: AssignmentRemovedEvent,
  ): Promise<void> {
    await this.notify(payload.staffMemberId, {
      actorId: payload.removedByManagerId,
      eventType: SchedulingEventPatterns.ASSIGNMENT_REMOVED,
      message: "You've been removed from a shift",
      link: `/staff/schedule/${payload.shiftId}`,
    });
  }

  @EventPattern(SchedulingEventPatterns.SWAP_REQUESTED)
  async onSwapRequested(@Payload() payload: SwapRequestedEvent): Promise<void> {
    await this.notify(payload.targetStaffMemberId, {
      actorId: payload.staffMemberId,
      eventType: SchedulingEventPatterns.SWAP_REQUESTED,
      message: 'A swap request has been sent to you',
      link: '/staff/swap-requests',
    });
  }

  @EventPattern(SchedulingEventPatterns.SWAP_ACCEPTED)
  async onSwapAccepted(@Payload() payload: SwapAcceptedEvent): Promise<void> {
    const original = await this.assignmentRepo.findById(
      payload.originalAssignmentId,
    );
    if (!original) return;

    await this.notify(original.staffMemberId, {
      actorId: payload.staffMemberId,
      eventType: SchedulingEventPatterns.SWAP_ACCEPTED,
      message: 'Your swap request was accepted',
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

    for (const staffId of staffIds) {
      await this.notify(staffId, {
        actorId: payload.approvedByManagerId,
        eventType: SchedulingEventPatterns.SWAP_APPROVED,
        message: 'Your swap was approved by a manager',
        link: `/staff/schedule/${payload.shiftId}`,
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

    for (const staffId of staffIds) {
      await this.notify(staffId, {
        actorId: payload.rejectedByManagerId,
        eventType: SchedulingEventPatterns.SWAP_REJECTED,
        message: 'Your swap was rejected',
        link: `/staff/schedule/${payload.shiftId}`,
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

    for (const ml of managers) {
      await this.notify(ml.managerId, {
        actorId: payload.staffMemberId,
        eventType: SchedulingEventPatterns.DROP_REQUESTED,
        message: 'A staff member requested to drop a shift',
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

    await this.notify(original.staffMemberId, {
      actorId: payload.claimedByStaffId,
      eventType: SchedulingEventPatterns.DROP_CLAIMED,
      message: 'Your drop request was claimed',
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

    for (const staffId of staffIds) {
      await this.notify(staffId, {
        actorId: payload.approvedByManagerId,
        eventType: SchedulingEventPatterns.DROP_APPROVED,
        message: 'Your drop was approved',
        link: `/staff/schedule/${payload.shiftId}`,
      });
    }
  }

  @EventPattern(SchedulingEventPatterns.DROP_REJECTED)
  async onDropRejected(@Payload() payload: DropRejectedEvent): Promise<void> {
    const original = await this.assignmentRepo.findById(
      payload.originalAssignmentId,
    );
    if (!original) return;

    await this.notify(original.staffMemberId, {
      actorId: payload.rejectedByManagerId,
      eventType: SchedulingEventPatterns.DROP_REJECTED,
      message: 'Your drop request was rejected',
      link: '/staff/swap-requests',
    });
  }
}
