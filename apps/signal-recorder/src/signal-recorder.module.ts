import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule } from '@app/shared';
import { SignalRecorderController } from './signal-recorder.controller';
import { SignalRecorderService } from './signal-recorder.service';
import { Signal } from './entities/signal.entity';
import { SignalRepository } from './repositories';

@Module({
  imports: [ConfigModule, SharedModule, TypeOrmModule.forFeature([Signal])],
  controllers: [SignalRecorderController],
  providers: [SignalRecorderService, SignalRepository],
})
export class SignalRecorderModule {}
