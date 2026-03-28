import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

export interface CreateNotificationInput {
  recipientId: number;
  actorId?: number;
  eventType: string;
  message: string;
  link?: string;
}

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(data: CreateNotificationInput): Promise<Notification> {
    const notification = this.repo.create(data);
    const saved = await this.repo.save(notification);
    this.logger.log(
      `Created notification ${saved.id} for recipient ${saved.recipientId} (${saved.eventType})`,
    );
    return saved;
  }

  async createMany(inputs: CreateNotificationInput[]): Promise<Notification[]> {
    const notifications = this.repo.create(inputs);
    return this.repo.save(notifications);
  }

  async findByRecipient(
    recipientId: number,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean },
  ): Promise<Notification[]> {
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.recipient_id = :recipientId', { recipientId })
      .orderBy('n.created_at', 'DESC');

    if (options?.unreadOnly) {
      qb.andWhere('n.is_read = false');
    }

    if (options?.limit) {
      qb.take(options.limit);
    }
    if (options?.offset) {
      qb.skip(options.offset);
    }

    return qb.getMany();
  }

  async markAsRead(id: number, recipientId: number): Promise<boolean> {
    const result = await this.repo.update(
      { id, recipientId },
      { isRead: true },
    );
    return (result.affected ?? 0) > 0;
  }

  async markAllAsRead(recipientId: number): Promise<number> {
    const result = await this.repo.update(
      { recipientId, isRead: false },
      { isRead: true },
    );
    return result.affected ?? 0;
  }

  async getUnreadCount(recipientId: number): Promise<number> {
    return this.repo.count({
      where: { recipientId, isRead: false },
    });
  }
}
