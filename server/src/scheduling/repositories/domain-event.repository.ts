import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { DomainEvent } from '../entities/domain-event.entity';
import { SCHEDULING_EVENTS_CLIENT } from '../scheduling.constants';

@Injectable()
export class DomainEventRepository {
  private readonly logger = new Logger(DomainEventRepository.name);

  constructor(
    @InjectRepository(DomainEvent)
    private readonly repo: Repository<DomainEvent>,
    @Inject(SCHEDULING_EVENTS_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  /**
   * Persist an event to the domain_events table and publish it
   * via the Redis transport for downstream consumers.
   */
  async append(data: {
    aggregateType: string;
    aggregateId: number;
    eventType: string;
    payload: Record<string, unknown>;
    actorId?: number;
  }): Promise<DomainEvent> {
    const event = this.repo.create(data);
    const saved = await this.repo.save(event);

    this.client
      .emit(data.eventType, {
        ...data.payload,
        eventId: saved.id,
      })
      .subscribe({
        error: (err) =>
          this.logger.warn(
            `Failed to publish event ${data.eventType} to Redis`,
            err,
          ),
      });

    return saved;
  }

  /**
   * Load event history for an aggregate (audit trail / future replay).
   */
  async findByAggregate(
    aggregateType: string,
    aggregateId: number,
  ): Promise<DomainEvent[]> {
    return this.repo.find({
      where: { aggregateType, aggregateId },
      order: { occurredAt: 'ASC' },
    });
  }
}
