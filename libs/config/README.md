# Config Module

This module centralizes configuration management for the PumpSpace backend services.

## Environment Variables

### Database Configuration
- `DB_HOST` - Database host address (required)
- `DB_PORT` - Database port (default: 5432)
- `DB_USERNAME` - Database username (required)
- `DB_PASSWORD` - Database password (required)
- `DB_DATABASE` - Database name (required)
- `DB_SYNCHRONIZE` - Enable/disable database schema synchronization (default: false)
- `DB_LOGGING` - Enable/disable database query logging (default: false)
- `DB_SSL` - Enable/disable SSL for database connection (default: false)
- `DB_MAX_CONNECTIONS` - Maximum number of database connections (default: 100)

### Redis Configuration
- `REDIS_HOST` - Redis host address (required)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_DB` - Redis database number (default: 0)
- `REDIS_TLS` - Enable/disable TLS for Redis connection (default: false)
- `REDIS_KEY_PREFIX` - Prefix for Redis keys (default: 'pumpspace:')
- `REDIS_RETRY_ATTEMPTS` - Number of Redis connection retry attempts (default: 10)
- `REDIS_RETRY_DELAY` - Delay between Redis connection retries in ms (default: 3000)
- `REDIS_POOL_SIZE` - Redis connection pool size (default: 10, implemented at service level)

### Shyft Configuration
- `SHYFT_API_KEY` - Shyft API key (required)
- `SHYFT_ENDPOINT` - Shyft API endpoint (required)
- `SHYFT_TIMEOUT` - Shyft API timeout in ms (default: 30000)

## Usage

```typescript
import { ConfigService } from '@libs/config';

@Injectable()
export class YourService {
  constructor(private configService: ConfigService) {}

  async someMethod() {
    const redisConfig = this.configService.redisConfig;
    const dbConfig = this.configService.databaseConfig;
    const shyftConfig = this.configService.shyftConfig;
  }
}
```

## Error Handling

The module includes comprehensive error handling:
- Required configuration validation using Joi
- Type-safe configuration access
- Descriptive error messages for missing or invalid configurations

## Notes

- Redis connection pooling is implemented at the service level using a connection pool manager
- All configurations are validated at application startup
- Environment variables can be loaded from `.env` files or system environment
