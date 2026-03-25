import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { EmployeeRepository } from './employee.repository';
import { AppConfigService } from '../config';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            createUser: jest.fn(),
            findByExternalId: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
        {
          provide: EmployeeRepository,
          useValue: {
            findByExternalId: jest.fn(),
            findOrCreateEmployee: jest.fn(),
          },
        },
        {
          provide: AppConfigService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
