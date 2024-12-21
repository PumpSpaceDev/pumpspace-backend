import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { Swap } from '../apps/data-collector/src/entities/swap.entity';
import { SmartMoney } from '../apps/smart-money-evaluator/src/entities/smart-money.entity';
import { Score } from '../apps/smart-money-evaluator/src/entities/score.entity';
import { Signal } from '../apps/signal-recorder/src/entities/signal.entity';
import { SignalEvaluation } from '../apps/signal-analyzer/src/entities/signal-evaluation.entity';
import { TokenBucket } from '../apps/analysis-statistics/src/entities/token-bucket.entity';

config();

async function generateMigration() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [
      Swap,
      SmartMoney,
      Score,
      Signal,
      SignalEvaluation,
      TokenBucket
    ],
    migrations: [join(__dirname, '../src/database/migrations/*.{ts,js}')],
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
  });

  try {
    await dataSource.initialize();
    console.log('Data Source initialized');

    const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();
    console.log('Schema changes:', sqlInMemory);

    await dataSource.destroy();
    console.log('Data Source destroyed');
  } catch (error) {
    console.error('Error during migration generation:', error);
    process.exit(1);
  }
}

generateMigration().catch(console.error);
