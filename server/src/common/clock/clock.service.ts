import { Injectable } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { AppConfigService } from '../../config';

@Injectable()
export class ClockService {
  constructor(private readonly configService: AppConfigService) {}

  now(): Temporal.Instant {
    const override = this.configService.get<string>('SIMULATED_TIME_UTC');
    if (override) {
      return Temporal.Instant.from(override);
    }
    return Temporal.Now.instant();
  }

  todayAtStartOfWeekUtc(): Temporal.PlainDate {
    const now = this.now();
    const plainDate = Temporal.PlainDate.from(now.toString());
    const dayOfWeek = plainDate.dayOfWeek;
    const daysToSubtract = dayOfWeek - 1;
    return plainDate.subtract({ days: daysToSubtract });
  }
}
