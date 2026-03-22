import { Injectable, Logger } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { AppConfigService } from '../../config';

@Injectable()
export class ClockService {
  private readonly logger = new Logger(ClockService.name);

  constructor(private readonly configService: AppConfigService) {}

  now(): Temporal.Instant {
    const override = this.configService.get<string>('SIMULATED_TIME_UTC');
    if (override) {
      try {
        return Temporal.Instant.from(override);
      } catch (e) {
        this.logger.warn(
          `Invalid SIMULATED_TIME_UTC: ${override}, error: ${e instanceof Error ? e.message : String(e)}`,
        );

        /**
         * Find better in future to handle this instead of hiding error under the rug and returning Now.instant()
         */
        return Temporal.Now.instant();
      }
    }
    return Temporal.Now.instant();
  }
}
