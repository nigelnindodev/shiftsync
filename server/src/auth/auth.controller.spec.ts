import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from 'src/security/jwt/jwt.service';
import { AppConfigService } from 'src/config';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            initiateOAuth: jest.fn(),
            handleOAuthCallback: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
        {
          provide: AppConfigService,
          useValue: {
            clientBaseUrl: 'http://localhost:3000',
            serverBaseUrl: 'http://localhost:5000',
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
