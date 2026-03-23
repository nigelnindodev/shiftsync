import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('domain_events')
export class DomainEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'aggregate_type' })
  aggregateType: string;

  @Index()
  @Column({ name: 'aggregate_id' })
  aggregateId: number;

  @Index()
  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ name: 'actor_id', nullable: true })
  actorId?: number;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;
}
