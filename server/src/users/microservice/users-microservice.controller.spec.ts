import { Test, TestingModule } from '@nestjs/testing';
import { UsersMicroserviceController } from './users-microservice.controller';
import { UsersService } from '../users.service';

describe('UsersMicroserviceController', () => {
  let controller: UsersMicroserviceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersMicroserviceController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getOrCreateUser: jest.fn(),
            createUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersMicroserviceController>(
      UsersMicroserviceController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
