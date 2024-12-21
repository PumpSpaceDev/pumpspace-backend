import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { SignalAnalyzerController } from './signal-analyzer.controller';
import { SignalAnalyzerService } from './signal-analyzer.service';
import { SignalEvaluation } from './entities/signal-evaluation.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.getDatabaseConfig(),
        entities: [SignalEvaluation],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([SignalEvaluation]),
  ],
  controllers: [SignalAnalyzerController],
  providers: [SignalAnalyzerService],
})
export class SignalAnalyzerModule {}
