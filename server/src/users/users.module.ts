import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './http/users.controller';
import { TestingController } from './http/testing.controller';
import { UsersMicroserviceController } from './microservice/users-microservice.controller';
import { UsersClientModule } from './users-client.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UsersRepository } from './users.repository';
import { EmployeeRepository } from './employee.repository';
import { Employee } from './entity/employee.entity';
import { SecurityModule } from 'src/security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Employee]),
    SecurityModule,
    UsersClientModule,
  ],
  providers: [UsersService, UsersRepository, EmployeeRepository],
  controllers: [
    UsersController,
    UsersMicroserviceController,
    TestingController,
  ],
  exports: [UsersService, EmployeeRepository],
})
export class UsersModule {}
