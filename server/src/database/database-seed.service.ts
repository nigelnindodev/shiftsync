import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { runSeed } from '../seed/seed';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    this.logger.log('Running database seed...');
    try {
      await runSeed(this.dataSource);
      this.logger.log('Database seed completed');
    } catch (error) {
      this.logger.error('Database seed failed', error);
    }
  }
}
