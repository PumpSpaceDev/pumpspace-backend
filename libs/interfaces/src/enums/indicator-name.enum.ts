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
