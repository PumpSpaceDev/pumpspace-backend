import { Network, SmartMoney, SmartMoneyType } from '@app/interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { SmartMoneyRepository } from 'apps/smart-money-evaluator/src/repositories/smart-money.repository';
import * as fs from 'fs';
import * as path from 'path';

const BATCH_SIZE = 1000;
const TGCHANNELLASTSYNCTIME_PATH = path.resolve(
  __dirname,
  '../../smart_money.json',
);

@Injectable()
export class SmartMoneyImportService {
  private readonly logger = new Logger(SmartMoneyImportService.name);
  constructor(private readonly smartMoneyRepository: SmartMoneyRepository) {}

  async importDataFromFile(): Promise<void> {
    if (!fs.existsSync(TGCHANNELLASTSYNCTIME_PATH)) {
      console.error('File not found');
      return;
    }

    try {
      const data = await fs.promises.readFile(
        TGCHANNELLASTSYNCTIME_PATH,
        'utf8',
      );
      const records = JSON.parse(data);

      let batch: Partial<SmartMoney>[] = [];
      let syncQueueTasks: Promise<void>[] = [];
      let count = 1;
      for (const record of records) {
        try {
          const smartMoneyRecord: Partial<SmartMoney> = {
            address: record.address,
            name: record.name || null,
            twitterHandle: record.twitterHandle || null,
            avatar: record.avatar || null,
            network: [
              Network[record.network.toUpperCase() as keyof typeof Network] ||
                Network.SOLANA,
            ],
            priority: record.priority || 4,
            type:
              SmartMoneyType[
                record.type.toUpperCase() as keyof typeof SmartMoneyType
              ] || SmartMoneyType.OTHER,
          };

          batch.push(smartMoneyRecord);

          if (batch.length >= BATCH_SIZE) {
            await this.insertBatch(batch);
            batch = [];
            await Promise.all(syncQueueTasks);
            syncQueueTasks = [];
            this.logger.debug(`Batch ${count * 1000} inserted.`);
            count++;
          }
        } catch (error) {
          console.error(`Error processing record: ${error.message}`);
          continue;
        }
      }

      if (batch.length > 0) {
        await this.insertBatch(batch);

        if (syncQueueTasks.length > 0) {
          await Promise.all(syncQueueTasks);
        }

        this.logger.debug(
          `Batch ${(count - 1) * 1000 + batch.length} inserted.`,
        );
      }

      console.log('Import finished!');
    } catch (error) {
      console.error('Error reading or parsing the file:', error.message);
    }
  }

  private async insertBatch(batch: Partial<SmartMoney>[]): Promise<void> {
    try {
      for (const record of batch) {
        await this.smartMoneyRepository.saveSmartMoney(record);
      }
    } catch (error) {
      console.error('Error inserting batch:', error.message);
      throw new Error('Batch insert failed');
    }
  }
}
