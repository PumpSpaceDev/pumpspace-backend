import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule } from '@app/shared';
import { Signal, SignalEvaluation } from '@app/interfaces';
import { SignalEvaluationService } from './services/signalEvaluation.service';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    TypeOrmModule.forFeature([SignalEvaluation, Signal]),
  ],
  providers: [SignalEvaluationService],
})
export class SignalAnalyzerModule {}
