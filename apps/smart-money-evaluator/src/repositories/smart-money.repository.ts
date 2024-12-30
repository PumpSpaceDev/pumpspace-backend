import { Repository } from 'typeorm';
import { SmartMoney } from '@app/interfaces';
import { Injectable, ConflictException } from '@nestjs/common';

@Injectable()
export class SmartMoneyRepository extends Repository<SmartMoney> {
  async saveSmartMoney(smartMoney: Partial<SmartMoney>): Promise<void> {
    try {
      const existingSmartMoney = await this.findOne({
        where: { address: smartMoney.address },
      });

      if (existingSmartMoney) {
        if (smartMoney.network) {
          existingSmartMoney.network = Array.from(
            new Set([...existingSmartMoney.network, ...smartMoney.network]),
          );
        }
        Object.assign(existingSmartMoney, smartMoney, {
          network: existingSmartMoney.network,
        });
      }

      await this.upsert(existingSmartMoney || (smartMoney as SmartMoney), [
        'address',
      ]);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Failed to save SmartMoney due to conflict',
        );
      }
      throw error;
    }
  }
}
