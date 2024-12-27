export enum SignalCategory {
  SmartMoney = 'SmartMoney',
  SocialMedia = 'SocialMedia',
  TechnicalAnalysis = 'TechnicalAnalysis',
  FundamentalAnalysis = 'FundamentalAnalysis',
  News = 'News',
  Other = 'Other',
}

export const SIGNAL_CATEGORIES = {
  gmgnsignals: SignalCategory.SmartMoney,
  pumpspace: SignalCategory.SmartMoney,
};

export function getSignalNameByCategory(category: SignalCategory): string[] {
  const entities = Object.entries(SIGNAL_CATEGORIES);
  const result = entities.filter(([, value]) => value === category);
  return result.map(([key]) => key);
}
