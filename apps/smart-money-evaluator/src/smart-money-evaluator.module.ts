import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { SmartMoneyEvaluatorController } from './smart-money-evaluator.controller';
import { SmartMoneyEvaluatorService } from './smart-money-evaluator.service';
import { SmartMoney } from './entities/smart-money.entity';
import { SmartMoneyScore } from './entities/smart-money-score.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.getDatabaseConfig(),
        entities: [SmartMoney, SmartMoneyScore],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([SmartMoney, SmartMoneyScore]),
  ],
  controllers: [SmartMoneyEvaluatorController],
  providers: [SmartMoneyEvaluatorService],
})
export class SmartMoneyEvaluatorModule {}
