import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';
import { AppConfigService } from '../../config';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: AppConfigService,
          useValue: {
            encryptionKeys: {
              current: 'key1',
              keys: {
                key1: Buffer.from('0123456789abcdef0123456789abcdef', 'hex'),
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
