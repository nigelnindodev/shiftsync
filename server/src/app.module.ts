import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfigModule, AppConfigService } from './config';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis';
import { SecurityModule } from './security/security.module';
import { pinoLoggerConfig } from './common/logger';
import { CommonModule } from './common/common.module';
import { StaffingModule } from './staffing/staffing.module';
import { SchedulingModule } from './scheduling/scheduling.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot(pinoLoggerConfig),
    CommonModule,
    RedisModule,
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) =>
        configService.typeOrmConfig,
    }),
    UsersModule,
    AuthModule,
    SecurityModule,
    StaffingModule,
    SchedulingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
