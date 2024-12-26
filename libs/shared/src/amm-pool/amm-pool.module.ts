import { Module } from '@nestjs/common';
import { AmmPoolService } from './amm-pool.service';

@Module({
  providers: [AmmPoolService],
  exports: [AmmPoolService],
})
export class AmmPoolModule {}
