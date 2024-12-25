import * as graphlib from 'graphlib';
import 'reflect-metadata';
import { IndicatorData } from './indicatorData';

// Enum for indicator names
export enum IndicatorName {
  ProfitIndicator7 = 'ProfitIndicator7', // #1 7天盈利
  ProfitIndicator30 = 'ProfitIndicator30', // #2  30天盈利
  WinRateIndicator30 = 'WinRateIndicator30', // #3  30天胜率
  StabilityIndicator = 'StabilityIndicator', // #4  利润稳定性

  ThirtyDayBuyCount = 'ThirtyDayBuyCount', // #5  30天买入次数
  ThirtyDaySellCount = 'ThirtyDaySellCount', // #6  30天卖出次数

  ThirtyDayBuyCost = 'ThirtyDayBuyCost', // #7  30天买入成本

  AverageBuyCostIndicator = 'AverageBuyCostIndicator', // #8  平均买入成本
  AverageSellProfitValueIndicator = 'AverageSellProfitValueIndicator', // #9  每次卖出利润均值
  AverageBuyProfitValueIndicator = 'AverageBuyProfitValueIndicator', // #10  每次买入利润均值
  AverageBuyProfitMarginPerPurchase = 'AverageBuyProfitMarginPerPurchase', // #11 每次买入利润率均值
  AverageSellProfitMarginPerPurchase = 'AverageSellProfitMarginPerPurchase', // #12  每次卖出利润率均值

  TradeStyleRatio = 'TradeStyleRatio', // #13  交易风格比例

  TotalProfitIndicator = 'TotalProfitIndicator', // #14 总盈利
  ProfitTop10PercentIndicator = 'ProfitTop10PercentIndicator', // #15  盈利 TOP 10 占比
  ProfitTop5PercentIndicator = 'ProfitTop5PercentIndicator', // #16 盈利 TOP 5 占比
  ProfitTop1PercentIndicator = 'ProfitTop1PercentIndicator', // #17 盈利 TOP 1 占比
  LossTop10PercentIndicator = 'LossTop10PercentIndicator', // #18 亏损 TOP 10 占比
  LossTop5PercentIndicator = 'LossTop5PercentIndicator', // #19  亏损 TOP 5 占比
  LossTop1PercentIndicator = 'LossTop1PercentIndicator', // #20 亏损 TOP 1 占比
}

interface IndicatorConfig {
  dependencies: IndicatorName[];
  calculationLogic: (
    indicators: {
      [key in IndicatorName]?: IndicatorData;
    },
    number: number[],
  ) => number[];
  scoreLogic: (value: number[]) => number;
}

// Configuration for indicator dependencies and calculation logic
const indicatorConfig: { [key in IndicatorName]: IndicatorConfig } = {
  [IndicatorName.ProfitIndicator7]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (v: number[]) => {
      const value = v[0];
      if (value <= 0) {
        return 0;
      }
      return Math.min(value / 250, 1);
    },
  },

  [IndicatorName.ProfitIndicator30]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (v: number[]) => {
      const value = v[0];
      if (value <= 0) {
        return 0;
      }
      return Math.min(value / 500, 1);
    },
  },

  [IndicatorName.WinRateIndicator30]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => value[0],
  },

  [IndicatorName.StabilityIndicator]: {
    dependencies: [
      IndicatorName.ProfitIndicator7,
      IndicatorName.ProfitIndicator30,
    ],
    calculationLogic: (indicators: {
      [key in IndicatorName]?: IndicatorData;
    }) => {
      const profit30 = IndicatorGraph.getValue(
        indicators[IndicatorName.ProfitIndicator30],
      );
      const profit7 = IndicatorGraph.getValue(
        indicators[IndicatorName.ProfitIndicator7],
      );
      if (profit7 === 0) {
        return [1];
      }
      return [profit30 / profit7];
    },
    scoreLogic: (value: number[]) => {
      const v = value[0];
      if (v >= 2) {
        return 0.5;
      } else if (v >= 1.5 && v < 2) {
        return 0.25;
      } else if (v >= 1 && v < 1.5) {
        return 0;
      } else {
        return -1;
      }
    },
  },

  [IndicatorName.ThirtyDayBuyCount]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: () => 0,
  },

  [IndicatorName.ThirtyDaySellCount]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: () => 0,
  },

  [IndicatorName.ThirtyDayBuyCost]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: () => 0,
  },

  [IndicatorName.AverageBuyCostIndicator]: {
    dependencies: [
      IndicatorName.ThirtyDayBuyCost,
      IndicatorName.ThirtyDayBuyCount,
    ],
    calculationLogic: (indicators: {
      [key in IndicatorName]?: IndicatorData;
    }) => {
      const buyCost = IndicatorGraph.getValue(
        indicators[IndicatorName.ThirtyDayBuyCost],
      );
      const buyCount = IndicatorGraph.getValue(
        indicators[IndicatorName.ThirtyDayBuyCount],
      );

      if (buyCount === 0) {
        throw new Error('Buy count is 0');
      }
      return [buyCost / buyCount];
    },
    scoreLogic: () => 0,
  },

  [IndicatorName.AverageSellProfitValueIndicator]: {
    dependencies: [
      IndicatorName.ProfitIndicator30,
      IndicatorName.ThirtyDaySellCount,
    ],
    calculationLogic: (indicators: {
      [key in IndicatorName]?: IndicatorData;
    }) => {
      const profit30 = IndicatorGraph.getValue(
        indicators[IndicatorName.ProfitIndicator30],
      );
      const sellCount = IndicatorGraph.getValue(
        indicators[IndicatorName.ThirtyDaySellCount],
      );

      if (sellCount === 0) {
        throw new Error('Sell count is 0');
      }
      return [profit30 / sellCount];
    },
    scoreLogic: (value: number[]) => {
      const v = value[0];
      if (v <= 1) {
        return 0;
      } else if (v > 10) {
        return 0.3;
      } else {
        return ((v - 1) / 9) * 0.3;
      }
    },
  },

  [IndicatorName.AverageBuyProfitValueIndicator]: {
    dependencies: [
      IndicatorName.ProfitIndicator30,
      IndicatorName.ThirtyDayBuyCount,
    ],
    calculationLogic: (indicators: {
      [key in IndicatorName]?: IndicatorData;
    }) => {
      const profit30 = IndicatorGraph.getValue(
        indicators[IndicatorName.ProfitIndicator30],
      );
      const buyCount = IndicatorGraph.getValue(
        indicators[IndicatorName.ThirtyDayBuyCount],
      );

      if (buyCount === 0) {
        throw new Error('Buy count is 0');
      }
      return [profit30 / buyCount];
    },
    scoreLogic: (value: number[]) => {
      const v = value[0];
      if (v <= 1) {
        return 0;
      } else if (v > 10) {
        return 0.3;
      } else {
        return ((v - 1) / 9) * 0.3;
      }
    },
  },

  [IndicatorName.AverageBuyProfitMarginPerPurchase]: {
    dependencies: [
      IndicatorName.AverageBuyProfitValueIndicator,
      IndicatorName.AverageBuyCostIndicator,
    ],
    calculationLogic: (indicators: {
      [key in IndicatorName]?: IndicatorData;
    }) => {
      const averageBuyProfitValue = IndicatorGraph.getValue(
        indicators[IndicatorName.AverageBuyProfitValueIndicator],
      );
      const averageBuyCost = IndicatorGraph.getValue(
        indicators[IndicatorName.AverageBuyCostIndicator],
      );

      if (averageBuyCost === 0) {
        throw new Error('Average buy cost is 0');
      }
      return [averageBuyProfitValue / averageBuyCost];
    },
    scoreLogic: (value: number[]) => {
      const v = value[0];
      if (v <= 0.2) {
        return 0;
      } else if (v > 1) {
        return 0.3;
      } else {
        return ((v - 0.2) / 0.8) * 0.3;
      }
    },
  },

  [IndicatorName.AverageSellProfitMarginPerPurchase]: {
    dependencies: [
      IndicatorName.AverageSellProfitValueIndicator,
      IndicatorName.AverageBuyCostIndicator,
    ],
    calculationLogic: (indicators: {
      [key in IndicatorName]?: IndicatorData;
    }) => {
      const averageSellProfitValue = IndicatorGraph.getValue(
        indicators[IndicatorName.AverageSellProfitValueIndicator],
      );
      const averageBuyCost = IndicatorGraph.getValue(
        indicators[IndicatorName.AverageBuyCostIndicator],
      );

      if (averageBuyCost === 0) {
        throw new Error('Average buy cost is 0');
      }
      return [averageSellProfitValue / averageBuyCost];
    },
    scoreLogic: (value: number[]) => {
      const v = value[0];
      if (v <= 0.2) {
        return 0;
      } else if (v > 1) {
        return 0.3;
      } else {
        return ((v - 0.2) / 0.8) * 0.3;
      }
    },
  },

  [IndicatorName.TradeStyleRatio]: {
    dependencies: [
      IndicatorName.AverageSellProfitValueIndicator,
      IndicatorName.AverageBuyProfitValueIndicator,
    ],
    calculationLogic: (indicators: {
      [key in IndicatorName]?: IndicatorData;
    }) => {
      const averageSellProfitValue = IndicatorGraph.getValue(
        indicators[IndicatorName.AverageSellProfitValueIndicator],
      );
      const averageBuyProfitValue = IndicatorGraph.getValue(
        indicators[IndicatorName.AverageBuyProfitValueIndicator],
      );

      if (averageBuyProfitValue === 0) {
        throw new Error('Average buy profit value is 0');
      }
      return [averageSellProfitValue / averageBuyProfitValue];
    },
    scoreLogic: (value: number[]) => {
      const v = value[0];
      if (v <= 0.5) {
        return 0;
      } else if (v > 2) {
        return 0.3;
      } else {
        return ((v - 0.5) / 1.5) * 0.3;
      }
    },
  },

  [IndicatorName.TotalProfitIndicator]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => {
      const totalProfitScore = value[0];
      if (totalProfitScore <= 0) {
        return 0;
      }
      return Math.min(totalProfitScore / 1000, 1);
    },
  },

  [IndicatorName.ProfitTop10PercentIndicator]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => {
      const totalProfitScore = value[0];
      if (totalProfitScore <= 0.3) {
        return 0;
      } else if (totalProfitScore > 0.7) {
        return 0.3;
      } else {
        return ((totalProfitScore - 0.3) / 0.4) * 0.3;
      }
    },
  },

  [IndicatorName.ProfitTop5PercentIndicator]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => {
      const totalProfitScore = value[0];
      if (totalProfitScore <= 0.2) {
        return 0;
      } else if (totalProfitScore > 0.5) {
        return 0.3;
      } else {
        return ((totalProfitScore - 0.2) / 0.3) * 0.3;
      }
    },
  },

  [IndicatorName.ProfitTop1PercentIndicator]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => {
      const totalProfitScore = value[0];
      if (totalProfitScore <= 0.1) {
        return 0;
      } else if (totalProfitScore > 0.3) {
        return 0.3;
      } else {
        return ((totalProfitScore - 0.1) / 0.2) * 0.3;
      }
    },
  },

  [IndicatorName.LossTop10PercentIndicator]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => {
      const totalProfitScore = value[0];
      if (totalProfitScore <= 0.3) {
        return 0.3;
      } else if (totalProfitScore > 0.7) {
        return 0;
      } else {
        return (1 - (totalProfitScore - 0.3) / 0.4) * 0.3;
      }
    },
  },

  [IndicatorName.LossTop5PercentIndicator]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => {
      const totalProfitScore = value[0];
      if (totalProfitScore <= 0.2) {
        return 0.3;
      } else if (totalProfitScore > 0.5) {
        return 0;
      } else {
        return (1 - (totalProfitScore - 0.2) / 0.3) * 0.3;
      }
    },
  },

  [IndicatorName.LossTop1PercentIndicator]: {
    dependencies: [],
    calculationLogic: (_, v) => v,
    scoreLogic: (value: number[]) => {
      const totalProfitScore = value[0];
      if (totalProfitScore <= 0.1) {
        return 0.3;
      } else if (totalProfitScore > 0.3) {
        return 0;
      } else {
        return (1 - (totalProfitScore - 0.1) / 0.2) * 0.3;
      }
    },
  },
};

export class IndicatorGraph {
  private static graph: graphlib.Graph;

  static initialize(): void {
    // Initialize the graph
    IndicatorGraph.graph = new graphlib.Graph();

    // Add nodes and edges based on dependencies
    Object.entries(indicatorConfig).forEach(([name, config]) => {
      IndicatorGraph.graph.setNode(name);
      config.dependencies.forEach((dep) => {
        IndicatorGraph.graph.setEdge(dep, name);
      });
    });
  }

  static getGraph(): graphlib.Graph {
    return IndicatorGraph.graph;
  }

  // Get calculation order based on dependencies
  static getCalculationOrder(): string[] {
    return graphlib.alg.topsort(IndicatorGraph.graph);
  }

  static getDependencies(name: IndicatorName): IndicatorName[] {
    return indicatorConfig[name].dependencies;
  }

  static getCalculationLogic(
    name: IndicatorName,
  ): (
    indicators: { [key in IndicatorName]?: IndicatorData },
    number: number[],
  ) => number[] {
    return indicatorConfig[name].calculationLogic;
  }

  static getScoreLogic(name: IndicatorName): (value: number[]) => number {
    return indicatorConfig[name].scoreLogic;
  }

  static initIndicators(): { [key in IndicatorName]: IndicatorData } {
    const indicators: { [key in IndicatorName]: IndicatorData } = {} as {
      [key in IndicatorName]: IndicatorData;
    };
    Object.keys(indicatorConfig).forEach((name) => {
      indicators[name as IndicatorName] = new IndicatorData(
        name as IndicatorName,
      );
    });
    return indicators;
  }

  static getValue(indicator: IndicatorData | undefined): number {
    if (!indicator || indicator.getValue().length === 0) {
      throw new Error('Indicator value not found');
    }
    return indicator.getValue()[0];
  }
}
