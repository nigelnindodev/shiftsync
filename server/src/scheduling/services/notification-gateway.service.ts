import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { Notification } from '../entities/notification.entity';

interface GatewayMessage {
  employeeId: number;
  notification: Notification;
}

@Injectable()
export class NotificationGateway implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly subject = new Subject<GatewayMessage>();

  notify(employeeId: number, notification: Notification): void {
    this.logger.log(
      `Pushing notification ${notification.id} to SSE stream for employee ${employeeId}`,
    );
    this.subject.next({ employeeId, notification });
  }

  getStream(employeeId: number): Observable<Notification> {
    return this.subject.asObservable().pipe(
      filter((msg) => msg.employeeId === employeeId),
      map((msg) => msg.notification),
    );
  }

  onModuleDestroy(): void {
    this.subject.complete();
  }
}
