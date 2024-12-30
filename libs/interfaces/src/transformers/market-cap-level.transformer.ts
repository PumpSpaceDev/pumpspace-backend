import { MarketCapLevel } from '../enums/market-cap-level.enum';

export class MarketCapLevelTransformer {
  to(data: MarketCapLevel): string {
    return data;
  }

  from(data: string): MarketCapLevel {
    if (!Object.values(MarketCapLevel).includes(data as MarketCapLevel)) {
      throw new Error(
        `Invalid MarketCapLevel value: ${data}. Expected one of ${Object.values(
          MarketCapLevel,
        ).join(', ')}`,
      );
    }
    return data as MarketCapLevel;
  }
}
