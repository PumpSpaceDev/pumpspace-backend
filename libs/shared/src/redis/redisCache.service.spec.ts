import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@app/config/config.service';
import { RedisCacheService } from './redisCache.service';
import { RedisService } from './redis.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockRedisService: Partial<RedisService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      expire: jest.fn(),
    };

    mockConfigService = {
      redisConfig: {
        host: 'localhost',
        port: 6379,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrSet', () => {
    const key = 'test-key';
    const ttl = 3600;
    const context = 'test';
    const mockData = { id: 1, name: 'test' };

    it('should return cached data if exists', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(
        JSON.stringify(mockData),
      );
      (mockRedisService.expire as jest.Mock).mockResolvedValue(1);

      const fetchFunction = jest.fn();
      const result = await service.getOrSet(key, ttl, fetchFunction, context);

      expect(result).toEqual(mockData);
      expect(mockRedisService.get).toHaveBeenCalledWith(key);
      expect(mockRedisService.expire).toHaveBeenCalledWith(key, ttl);
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    it('should fetch and cache new data if cache miss', async () => {
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      (mockRedisService.set as jest.Mock).mockResolvedValue('OK');

      const fetchFunction = jest.fn().mockResolvedValue(mockData);
      const result = await service.getOrSet(key, ttl, fetchFunction, context);

      expect(result).toEqual(mockData);
      expect(mockRedisService.get).toHaveBeenCalledWith(key);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        key,
        JSON.stringify(mockData),
        ttl,
      );
      expect(fetchFunction).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      (mockRedisService.get as jest.Mock)
        .mockRejectedValueOnce(new Error('Redis error'))
        .mockResolvedValueOnce(JSON.stringify(mockData));
      (mockRedisService.expire as jest.Mock).mockResolvedValue(1);

      const fetchFunction = jest.fn();
      const result = await service.getOrSet(key, ttl, fetchFunction, context);

      expect(result).toEqual(mockData);
      expect(mockRedisService.get).toHaveBeenCalledTimes(2);
    });

    it('should fallback to fetch function after max retries', async () => {
      (mockRedisService.get as jest.Mock).mockRejectedValue(
        new Error('Redis error'),
      );
      const fetchFunction = jest.fn().mockResolvedValue(mockData);

      const result = await service.getOrSet(key, ttl, fetchFunction, context);

      expect(result).toEqual(mockData);
      expect(mockRedisService.get).toHaveBeenCalledTimes(3); // MAX_RETRIES
      expect(fetchFunction).toHaveBeenCalled();
    });
  });

  describe('getPoolInfo', () => {
    const amm = 'test-amm';
    const mockPoolInfo = { liquidity: '1000', volume: '500' };

    it('should return null if no fetch function provided', async () => {
      const result = await service.getPoolInfo(amm);
      expect(result).toBeNull();
    });

    it('should use getOrSet for pool info', async () => {
      const fetchFunction = jest.fn().mockResolvedValue(mockPoolInfo);
      jest.spyOn(service, 'getOrSet').mockResolvedValue(mockPoolInfo);

      const result = await service.getPoolInfo(amm, fetchFunction);

      expect(result).toEqual(mockPoolInfo);
      expect(service.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining(amm),
        expect.any(Number),
        expect.any(Function),
        expect.stringContaining(amm),
      );
    });
  });
});
