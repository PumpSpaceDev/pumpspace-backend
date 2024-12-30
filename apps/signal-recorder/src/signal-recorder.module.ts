import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule } from '@app/shared';
import { SignalRecorderController } from './signal-recorder.controller';
import { SignalRecorderService } from './signal-recorder.service';
import { Signal, SmartMoney } from '@app/interfaces';
import { SignalRepository } from '@app/signal-analyzer/repositories/signal.repository';
import { TgChannelService } from './tgclient/tgChannel.service';
import { SmartMoneyRepository } from 'apps/smart-money-evaluator/src/repositories/smart-money.repository';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    TypeOrmModule.forFeature([Signal, SmartMoney]),
  ],
  controllers: [SignalRecorderController],
  providers: [
    SignalRecorderService,
    SignalRepository,
    TgChannelService,
    SmartMoneyRepository,
  ],
})
export class SignalRecorderModule {}
