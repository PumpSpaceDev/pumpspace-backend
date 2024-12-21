import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'pumpspace:',
  retryAttempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '10', 10),
  retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '3000', 10),
  poolSize: parseInt(process.env.REDIS_POOL_SIZE || '10', 10),
}));
