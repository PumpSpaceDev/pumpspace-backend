import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { Swap } from '../../apps/data-collector/src/entities/swap.entity';
import { SmartMoney } from '../../apps/smart-money-evaluator/src/entities/smart-money.entity';
import { Score } from '../../apps/smart-money-evaluator/src/entities/score.entity';
import { Signal } from '../../apps/signal-recorder/src/entities/signal.entity';
import { SignalEvaluation } from '../../apps/signal-analyzer/src/entities/signal-evaluation.entity';
import { TokenBucket } from '../../apps/analysis-statistics/src/entities/token-bucket.entity';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pumpspace',
  entities: [Swap, SmartMoney, Score, Signal, SignalEvaluation, TokenBucket],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});

export default dataSource;
