import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@app/config';
import { SharedModule } from '@app/shared';
import { SmartMoneyEvaluatorController } from './smart-money-evaluator.controller';
import { SmartMoneyEvaluatorService } from './smart-money-evaluator.service';
import { SmartMoney } from './entities/smart-money.entity';
import { Score } from './entities/score.entity';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    TypeOrmModule.forFeature([SmartMoney, Score]),
  ],
  controllers: [SmartMoneyEvaluatorController],
  providers: [SmartMoneyEvaluatorService],
})
export class SmartMoneyEvaluatorModule {}
