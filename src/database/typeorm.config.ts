import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { join } from 'path';
import { Swap } from '../../apps/data-collector/src/entities/swap.entity';
import { SmartMoney } from '../../apps/smart-money-evaluator/src/entities/smart-money.entity';
import { Score } from '../../apps/smart-money-evaluator/src/entities/score.entity';
import { Signal } from '../../apps/signal-recorder/src/entities/signal.entity';
import { SignalEvaluation } from '../../apps/signal-analyzer/src/entities/signal-evaluation.entity';
import { TokenBucket } from '../../apps/analysis-statistics/src/entities/token-bucket.entity';
import { Notification } from '../../apps/notification/src/entities/notification.entity';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: parseInt(configService.get('DB_PORT')),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [
    Swap,
    SmartMoney,
    Score,
    Signal,
    SignalEvaluation,
    TokenBucket,
    Notification
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: configService.get('DB_LOGGING') === 'true',
});
