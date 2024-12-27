import { Network } from '../enums/network.enum';
import { ValueTransformer } from 'typeorm';

export class NetworkTransformer implements ValueTransformer {
  to(value: Network[]): string {
    const sortedValue = value.sort((a, b) => a.localeCompare(b));
    return sortedValue.join(',');
  }

  from(value: string): Network[] {
    return value
      .split(',')
      .filter((network) => network in Network)
      .map((network) => Network[network as keyof typeof Network]);
  }
}
