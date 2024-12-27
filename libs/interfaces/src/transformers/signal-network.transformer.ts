import { Network } from '../enums';

export class SignalNetworkTransformer {
  to(data: string): Network {
    if (!Object.values(Network).includes(data as Network)) {
      throw new Error(
        `Invalid Network value: ${data}. Expected one of ${Object.values(
          Network,
        ).join(', ')}`,
      );
    }
    return data as Network;
  }

  from(data: Network): string {
    return data;
  }
}
