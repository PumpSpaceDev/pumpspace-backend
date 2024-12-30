import { Api } from 'telegram';
import { MatchedEntity, TokenRecommond } from '../message.format';
import { Network } from '@app/interfaces';

// Channel default format
export class Channel_Default {
  /**
   * format
   * @param message
   */
  static async format(
    message: Api.Message,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _entities: MatchedEntity[],
  ): Promise<TokenRecommond | null> {
    const text = message.message;
    const chat: any = await message.getChat();
    const uniqueCode = `${message.id}_${chat?.id}_${message.date}`;

    const tokenAddressRegex = /([A-Za-z0-9]+[A-Za-z0-9]+)/; //  H33XL6HHDReCVRgSApZpsXM7Hy7JGyLztRJaGxjapump
    const tokenAddress = (text.match(tokenAddressRegex) || [])[1];

    return {
      uniqueCode,
      network: Network.SOLANA,
      channelUsername: chat?.username || chat?.id,
      timestamp: message.date,
      token: {
        address: tokenAddress,
      },
      records: [],
    };
  }
}
