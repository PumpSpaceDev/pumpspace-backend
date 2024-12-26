import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule } from '@app/shared';
import { SignalAnalyzerController } from './signal-analyzer.controller';
import { SignalAnalyzerService } from './signal-analyzer.service';
import { SignalEvaluation } from './entities/signal-evaluation.entity';
import { SignalEvaluationRepository } from './repositories';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    TypeOrmModule.forFeature([SignalEvaluation]),
  ],
  controllers: [SignalAnalyzerController],
  providers: [SignalAnalyzerService, SignalEvaluationRepository],
})
export class SignalAnalyzerModule {}
