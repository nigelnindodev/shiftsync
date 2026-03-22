import { Injectable, Logger } from '@nestjs/common';
import { Temporal } from '@js-temporal/polyfill';
import { AppConfigService } from '../../config';

@Injectable()
export class ClockService {
  private readonly logger = new Logger(ClockService.name);
  private parsedSimulatedInstant: Temporal.Instant | null = null;
  private parsedSimulatedAttempted = false;

  constructor(private readonly configService: AppConfigService) {}

  now(): Temporal.Instant {
    const override = this.configService.get<string>('SIMULATED_TIME_UTC');
    if (override) {
      if (this.parsedSimulatedAttempted) {
        return this.parsedSimulatedInstant ?? Temporal.Now.instant();
      }
      this.parsedSimulatedAttempted = true;
      try {
        this.parsedSimulatedInstant = Temporal.Instant.from(override);
        return this.parsedSimulatedInstant;
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
