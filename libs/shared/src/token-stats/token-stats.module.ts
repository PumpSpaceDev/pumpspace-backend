import { Module } from '@nestjs/common';
import { RedisModule } from '../redis';
import { TokenStatsService } from './token-stats.service';

@Module({
  imports: [RedisModule],
  providers: [TokenStatsService],
  exports: [TokenStatsService],
})
export class TokenStatsModule {}
