import { ValueTransformer } from 'typeorm';
import { SmartMoneyType } from '../enums/smart-money-type.enum';

export class SmartMoneyTypeTransformer implements ValueTransformer {
  to(value: SmartMoneyType): string {
    return value.toString();
  }

  from(value: string): SmartMoneyType {
    if (!Object.values(SmartMoneyType).includes(value as SmartMoneyType)) {
      throw new Error(
        `Invalid SmartMoneyType value: ${value}. Expected one of ${Object.values(
          SmartMoneyType,
        ).join(', ')}`,
      );
    }
    return SmartMoneyType[value as keyof typeof SmartMoneyType];
  }
}
