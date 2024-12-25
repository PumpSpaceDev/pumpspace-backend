import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { IndicatorData } from './indicatorData';
import { Indicator } from '../indicator/entities/indicator.entity';
import { Network } from '../indicator/types/network.enum';
import { Platform } from '../indicator/types/platform.enum';
import { Swap } from '@app/shared-swaps';
import { IndicatorGraph, IndicatorName } from '../indicator/indicatorGraph';
import { SOL_DECIMAL } from '../indicator/constants';
import { IndicatorRepository } from '../indicator/repositories/indicator.repository';
import { ScoreRepository } from '../indicator/repositories/score.repository';
import { TokenService } from '../indicator/token/token.service';
import BigNumber from 'bignumber.js';

const SUPPORT_PLATFORMS = [Platform.Moonshot, Platform.PumpFun];

enum SwapType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export interface SwapResult {
  token: string;
  cost: bigint;
  profit: bigint;
  tokenBuyAmount: bigint;
  tokenSellAmount: bigint;
  decimal: number;
  account: string;
  swapType: SwapType;
}

@Injectable()
export class IndicatorService {
  private readonly logger: Logger = new Logger(IndicatorService.name);

  constructor(
    @InjectRepository(Swap)
    private readonly swapRepository: Repository<Swap>,
    private readonly indicatorRepository: IndicatorRepository,
    private readonly scoreRepository: ScoreRepository,
    private readonly tokenService: TokenService,
  ) {
    IndicatorGraph.initialize();
  }

  private async initializeIndicators(
    account: string,
    network: Network,
  ): Promise<{
    [key in IndicatorName]: IndicatorData;
  }> {
    const indicators: { [key in IndicatorName]: IndicatorData } =
      IndicatorGraph.initIndicators();

    const TradeData30Days = await this.load30DaysTradeData(account);
    if (TradeData30Days.length > 3000) {
      throw new Error('TradeData30Days.length > 3000');
    }
    const TradeData7Days = this.filterLast7DaysTradeData(TradeData30Days);

    const groupedByToken = await this.groupByToken(TradeData30Days, network);

    const tokenCostAndProfit30 = this.mapToTokenCostAndProfit(
      groupedByToken,
      network,
      '30days',
    );

    indicators[IndicatorName.WinRateIndicator30].setValue([
      tokenCostAndProfit30.length > 0
        ? tokenCostAndProfit30.filter((item) => item.profit > item.cost)
            .length / tokenCostAndProfit30.length
        : 0,
    ]);

    const { buyCount, sellCount } =
      this.sumToBuyAndSellCount(tokenCostAndProfit30);
    if (buyCount === 0 || sellCount === 0) {
      throw new Error('buyCount ===0 || sellCount === 0');
    }
    indicators[IndicatorName.ThirtyDayBuyCount].setValue([buyCount]);
    indicators[IndicatorName.ThirtyDaySellCount].setValue([sellCount]);

    const [top1TokenGain, top5TokenGain, top10TokenGain, top30TokenGain] =
      this.sliceMultiTop(
        tokenCostAndProfit30
          .map((item) => item.profit - item.cost)
          .filter((v) => v > 0)
          .sort((a, b) => b - a),
      );
    const [top1TokenLoss, top5TokenLoss, top10TokenLoss, top30TokenLoss] =
      this.sliceMultiTop(
        tokenCostAndProfit30
          .map((item) => item.cost - item.profit)
          .filter((v) => v > 0)
          .sort((a, b) => b - a),
      );

    const totalProfitIndicator = top30TokenGain - top30TokenLoss;
    indicators[IndicatorName.TotalProfitIndicator].setValue([
      totalProfitIndicator,
    ]);
    indicators[IndicatorName.ProfitTop1PercentIndicator].setValue([
      top1TokenGain / totalProfitIndicator,
    ]);
    indicators[IndicatorName.ProfitTop5PercentIndicator].setValue([
      top5TokenGain / totalProfitIndicator,
    ]);
    indicators[IndicatorName.ProfitTop10PercentIndicator].setValue([
      top10TokenGain / totalProfitIndicator,
    ]);
    indicators[IndicatorName.LossTop1PercentIndicator].setValue([
      top1TokenLoss / totalProfitIndicator,
    ]);
    indicators[IndicatorName.LossTop5PercentIndicator].setValue([
      top5TokenLoss / totalProfitIndicator,
    ]);
    indicators[IndicatorName.LossTop10PercentIndicator].setValue([
      top10TokenLoss / totalProfitIndicator,
    ]);

    const { totalCost: totalCost30, totalProfit: totalProfit30 } =
      this.reduceToTotalCostAndProfit(tokenCostAndProfit30);
    indicators[IndicatorName.ThirtyDayBuyCost].setValue([totalCost30]);
    indicators[IndicatorName.ProfitIndicator30].setValue([
      totalProfit30 - totalCost30,
    ]);

    if (totalProfit30 - totalCost30 <= 0) {
      throw new Error('totalProfit30 - totalCost30 <= 0');
    }

    const tokenCostAndProfit7 = this.mapToTokenCostAndProfit(
      await this.groupByToken(TradeData7Days, network),
      network,
      '7days',
    );
    const { totalCost: totalCost7, totalProfit: totalProfit7 } =
      this.reduceToTotalCostAndProfit(tokenCostAndProfit7);
    indicators[IndicatorName.ProfitIndicator7].setValue([
      totalProfit7 - totalCost7,
    ]);

    return indicators;
  }

  private async calculateIndicators(
    account: string,
    network: Network,
  ): Promise<IndicatorData[]> {
    const indicators = await this.initializeIndicators(account, network);

    const calculationOrder = IndicatorGraph.getCalculationOrder();

    for (const node of calculationOrder) {
      const indicator = indicators[node as IndicatorName];
      if (indicator) {
        indicator.calculate(indicators);
      } else {
        throw new Error(`Indicator ${node} not found`);
      }
    }

    return Object.values(indicators);
  }

  async calculateScore(
    account: string,
    network: Network,
  ): Promise<{
    indicators: IndicatorData[];
    totalScore: number;
    reason?: string;
  }> {
    try {
      let totalScore: number = 0;
      const indicators = await this.calculateIndicators(account, network);
      for (const indicator of indicators) {
        if (indicator.getValue().length === 0) {
          throw new Error(
            `Indicator value length = 0 : ${indicator.getName()}`,
          );
        }
        this.logger.debug(
          `account: ${account}, ${indicator.getName()} - value: ${
            indicator.getValue()[0]
          } score: ${indicator.calculateScore()}`,
        );
        totalScore += indicator.calculateScore();
      }
      this.logger.debug(`account: ${account}, TotalScore: ${totalScore}`);
      return { indicators, totalScore, reason: '' };
    } catch (e) {
      this.logger.error(`ABNORMAL account: ${account}, TotalScore: -1`);
      this.logger.error(e);
      return { indicators: [], totalScore: -1, reason: e.message };
    }
  }

  async saveIndicators(
    indicators: IndicatorData[],
    totalScore: number,
    account: string,
  ): Promise<void> {
    for (const indicator of indicators) {
      const entity = new Indicator();
      entity.account = account;
      entity.type = indicator.getName();
      entity.value = indicator.getValue()[0];
      entity.score = indicator.calculateScore();
      await this.indicatorRepository.upsert(entity, true);
    }

    await this.scoreRepository.add({
      address: account,
      time: new Date(),
      score: totalScore,
    });
  }

  private async load30DaysTradeData(account: string): Promise<Swap[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.swapRepository.find({
      where: {
        signer: account,
        timestamp: MoreThanOrEqual(thirtyDaysAgo),
      },
      order: {
        timestamp: 'DESC',
      },
    });
  }

  private filterLast7DaysTradeData(arr: Swap[]): Swap[] {
    return arr.filter(
      (item) =>
        new Date(item.timestamp).getTime() >
        Date.now() - 7 * 24 * 60 * 60 * 1000,
    );
  }

  private async groupByToken(
    swaps: Swap[],
    network: Network,
  ): Promise<Record<string, SwapResult[]>> {
    if (network !== Network.SOLANA) {
      throw new Error('Network not supported');
    }

    const result = swaps.reduce(
      (acc, swap) => {
        const token = swap.amm;
        if (!acc[token]) {
          acc[token] = [];
        }
        
        acc[token].push({
          token,
          cost: swap.direction === 0 ? BigInt(swap.amountIn) : 0n,
          profit: swap.direction === 1 ? BigInt(swap.amountOut) : 0n,
          tokenBuyAmount: swap.direction === 0 ? BigInt(swap.amountOut) : 0n,
          tokenSellAmount: swap.direction === 1 ? BigInt(swap.amountIn) : 0n,
          decimal: SOL_DECIMAL,
          account: swap.signer,
          swapType: swap.direction === 0 ? SwapType.BUY : SwapType.SELL,
        });
        
        return acc;
      },
      {} as Record<string, SwapResult[]>,
    );

    const finalResult: Record<string, SwapResult[]> = {};
    for (const token in result) {
      const token_platform = await this.tokenService.getTokenPlatform();
      if (SUPPORT_PLATFORMS.includes(token_platform)) {
        finalResult[token] = result[token];
      }
    }
    return finalResult;
  }

  private mapToTokenCostAndProfit(
    groupedByToken: Record<string, SwapResult[]>,
    network: Network,
    _logPrefix: string,
  ): {
    token: string;
    cost: number;
    profit: number;
    buyCount: number;
    sellCount: number;
  }[] {
    if (network !== Network.SOLANA) {
      throw new Error('Network not supported');
    }

    const entries = Object.entries(groupedByToken)
      .map(([token, values]) => {
        const cost = values.reduce((sum, item) => sum + item.cost, 0n);
        const profit = values.reduce((sum, item) => sum + item.profit, 0n);
        const tokenBuyAmount = values.reduce(
          (sum, item) => sum + item.tokenBuyAmount,
          0n,
        );
        const tokenSellAmount = values.reduce(
          (sum, item) => sum + item.tokenSellAmount,
          0n,
        );

        const buyCount = values.filter(
          (item) => item.swapType === SwapType.BUY,
        ).length;
        const sellCount = values.filter(
          (item) => item.swapType === SwapType.SELL,
        ).length;

        const decimal = values[0].decimal;
        const account = values[0].account;
        return {
          token,
          cost,
          profit,
          tokenBuyAmount,
          tokenSellAmount,
          decimal,
          account,
          buyCount,
          sellCount,
        };
      })
      .filter((item) => {
        if (item.tokenSellAmount > item.tokenBuyAmount) {
          this.logger.warn(
            `${_logPrefix} tokenSellAmount > tokenBuyAmount, account: ${item.account} token: ${item.token}  tokenSellAmount: ${item.tokenSellAmount} tokenBuyAmount: ${item.tokenBuyAmount} `,
          );
          return false;
        }
        return true;
      })
      .map(({ token, cost, profit, buyCount, sellCount }) => ({
        token,
        cost: formatSol(cost),
        profit: formatSol(profit),
        buyCount,
        sellCount,
      }));

    return entries;
  }

  private reduceToTotalCostAndProfit(
    tokenCostAndProfitArr: {
      token: string;
      cost: number;
      profit: number;
    }[],
  ): { totalCost: number; totalProfit: number } {
    const totalCost = tokenCostAndProfitArr.reduce(
      (sum, item) => sum + item.cost,
      0,
    );
    const totalProfit = tokenCostAndProfitArr.reduce(
      (sum, item) => sum + item.profit,
      0,
    );
    return { totalCost, totalProfit };
  }

  private sumToBuyAndSellCount(
    groupedByToken: {
      token: string;
      cost: number;
      profit: number;
      buyCount: number;
      sellCount: number;
    }[],
  ): {
    buyCount: number;
    sellCount: number;
  } {
    return groupedByToken.reduce(
      (acc, item) => {
        acc.buyCount += item.buyCount;
        acc.sellCount += item.sellCount;
        return acc;
      },
      { buyCount: 0, sellCount: 0 },
    );
  }

  private sliceMultiTop(arr: number[]): [number, number, number, number] {
    return [
      arr.slice(0, 1).reduce((acc, cur) => acc + cur, 0),
      arr.slice(0, 5).reduce((acc, cur) => acc + cur, 0),
      arr.slice(0, 10).reduce((acc, cur) => acc + cur, 0),
      arr.slice(0, 30).reduce((acc, cur) => acc + cur, 0),
    ];
  }
}

function formatSol(lamports: bigint): number {
  return Number(
    new BigNumber(lamports.toString()).div(10 ** SOL_DECIMAL).toFixed(3),
  );
}
