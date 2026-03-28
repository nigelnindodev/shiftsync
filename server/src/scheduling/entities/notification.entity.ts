import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../users/entity/employee.entity';

@Entity('notifications')
@Index('idx_notification_recipient_unread', ['recipientId', 'isRead'])
@Index('idx_notification_recipient_created', ['recipientId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Employee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  @Index()
  recipient: Employee;

  @Column({ name: 'recipient_id' })
  recipientId: number;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor?: Employee;

  @Column({ name: 'actor_id', nullable: true })
  actorId?: number;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  link?: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
