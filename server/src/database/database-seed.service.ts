import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { runSeed } from '../seed/seed';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking if seed data exists...');
    try {
      await runSeed(this.dataSource, true);
      this.logger.log('Database seed check completed');
    } catch (error) {
      this.logger.error('Database seed check failed', error);
    }
  }
}
