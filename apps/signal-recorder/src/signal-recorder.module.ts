import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule } from '@app/shared';
import { SignalRecorderController } from './signal-recorder.controller';
import { SignalRecorderService } from './signal-recorder.service';
import { TgSignalService } from './tg/tg-signal.service';
import { TelegramClientService } from './tg/telegram-client.service';
import { MessageFormat } from './tg/message.format';
import { Signal } from '@app/interfaces';

@Module({
  imports: [ConfigModule, SharedModule, TypeOrmModule.forFeature([Signal])],
  controllers: [SignalRecorderController],
  providers: [
    SignalRecorderService,
    TgSignalService,
    TelegramClientService,
    MessageFormat,
  ],
})
export class SignalRecorderModule {}
