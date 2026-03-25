import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { OAuthStrategyService } from './strategies/strategy.service';
import { AuthRepository } from './user.repository';
import { CryptoService } from 'src/security/crypto/crypto.service';
import { RedisService } from 'src/redis';
import { USER_SERVICE } from 'src/constants';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: OAuthStrategyService,
          useValue: { getStrategy: jest.fn() },
        },
        {
          provide: AuthRepository,
          useValue: { saveToken: jest.fn(), findToken: jest.fn() },
        },
        {
          provide: CryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        {
          provide: USER_SERVICE,
          useValue: { send: jest.fn(), emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
