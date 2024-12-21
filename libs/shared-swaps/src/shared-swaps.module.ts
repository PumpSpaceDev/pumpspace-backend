import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@app/shared';
import { Swap } from './entities';
import { SwapsQueryService } from './swaps-query.service';

@Module({
  imports: [TypeOrmModule.forFeature([Swap]), SharedModule],
  providers: [SwapsQueryService],
  exports: [SwapsQueryService],
})
export class SharedSwapsModule {}
