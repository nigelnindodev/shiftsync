import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';
import { AppConfigService } from '../../config';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: AppConfigService,
          useValue: {
            jwtSecret: 'test-secret-key-for-testing-purposes',
          },
        },
      ],
    }).compile();

    service = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
