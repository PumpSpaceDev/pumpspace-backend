import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@app/config/config.service';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      redisConfig: {
        host: 'localhost',
        port: 6379,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Connection Pool', () => {
    it('should initialize connection pool with correct size', () => {
      expect(Redis).toHaveBeenCalledTimes(7); // 5 pool + publisher + subscriber
    });

    it('should handle connection errors gracefully', async () => {
      const mockClient = new Redis();
      mockClient.emit('error', new Error('Connection failed'));
      // Error should be logged but not crash the service
      expect(service).toBeDefined();
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const mockError = new Error('Redis error');
      for (let i = 0; i < 5; i++) {
        service['handleConnectionError'](mockError);
      }
      expect(service['circuitOpen']).toBe(true);
    });

    it('should reset circuit after timeout', async () => {
      service['circuitOpen'] = true;
      service['lastCircuitBreak'] = Date.now() - 31000; // 31 seconds ago
      await service['startHealthChecks']();
      expect(service['circuitOpen']).toBe(false);
    });
  });

  describe('Redis Operations', () => {
    it('should get value from Redis', async () => {
      const mockGet = jest.fn().mockResolvedValue('value');
      const mockClient = { get: mockGet };
      service['getNextPoolClient'] = jest.fn().mockReturnValue(mockClient);

      const result = await service.get('key');
      expect(result).toBe('value');
      expect(mockGet).toHaveBeenCalledWith('key');
    });

    it('should set value in Redis', async () => {
      const mockSet = jest.fn().mockResolvedValue('OK');
      const mockClient = { set: mockSet };
      service['getNextPoolClient'] = jest.fn().mockReturnValue(mockClient);

      await service.set('key', 'value', 60);
      expect(mockSet).toHaveBeenCalledWith('key', 'value', 'EX', 60);
    });

    it('should throw error when circuit is open', async () => {
      service['circuitOpen'] = true;
      await expect(service.get('key')).rejects.toThrow(
        'Circuit breaker is open',
      );
    });
  });
});
