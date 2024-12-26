import { Api } from 'telegram';
import { MatchedEntity, TokenRecommond } from '../message.format';
import { Network } from '@app/interfaces/enums/network.enum';
import { NETWORK_SOLANA } from '../constants';

export class Channel_Default {
  static async format(
    message: Api.Message,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _entities: MatchedEntity[], // Parameter required for interface compatibility
  ): Promise<TokenRecommond | null> {
    const text = message.message;
    const chat: any = await message.getChat();
    const uniqueCode = `${message.id}_${chat?.id}_${message.date}`;

    const tokenAddressRegex = /([A-Za-z0-9]+[A-Za-z0-9]+)/;
    const tokenAddress = (text.match(tokenAddressRegex) || [])[1];

    return {
      uniqueCode,
      network: Network[NETWORK_SOLANA.toUpperCase() as keyof typeof Network],
      channelUsername: chat?.username || chat?.id,
      timestamp: message.date,
      token: {
        address: tokenAddress,
      },
      records: [],
    };
  }
}
