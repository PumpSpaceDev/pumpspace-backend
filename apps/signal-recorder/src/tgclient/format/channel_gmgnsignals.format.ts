import { Api } from 'telegram';
import { MatchedEntity, TokenRecommond } from '../message.format';
import { Network, SmartMoneyType } from '@app/interfaces';

// Channel_Gmgn format
export class channel_Gmgnsignals {
  /**
   * format
   * @param message
   */
  static async format(
    message: Api.Message,
    entities: MatchedEntity[],
  ): Promise<TokenRecommond | null> {
    const text = message.message;
    const chat: any = await message.getChat();
    const matchRes = {
      uniqueCode: '',
      channelUsername: chat?.username || chat?.id,
      network: Network.SOLANA,
      timestamp: message.date,
      token: {
        address: '',
        devAddress: '',
      },
      records: [],
    } as TokenRecommond;

    let type = SmartMoneyType.OTHER;
    const typeRegex = /(KOL|Smart Money)\sBuy/;
    const typeText = (text.match(typeRegex) || [])[1];
    if (typeText == 'KOL') {
      type = SmartMoneyType.KOL;
    } else if (typeText == 'Smart Money') {
      type = SmartMoneyType.SMART;
    } else {
      return null;
    }

    const caRegex = /\$[A-Za-z]+\([^)]+\)\n([A-Za-z0-9]+)/;
    const symbolRegex = /\$([A-Za-z]+)\(/;

    const ca = (text.match(caRegex) || [])[1];
    const symbol = (text.match(symbolRegex) || [])[1];
    let buyers = [];
    if (type === SmartMoneyType.KOL) {
      const kolBuyersRegex = /^(.*?)\s+\d+[a-z]+\sago/gm;
      buyers = [...text.matchAll(kolBuyersRegex)].map((match) =>
        match[1].trim(),
      );
    } else if (type === SmartMoneyType.SMART) {
      const smartMoneyBuyersRegex = /^([A-Za-z0-9.]+)\s+\d+[a-z]+\sago/gm;
      buyers = [...text.matchAll(smartMoneyBuyersRegex)].map((match) =>
        match[1].trim(),
      );
    }

    // entities map
    const entityMap = entities.reduce((acc, item) => {
      acc[item.matchedText] = item.entity;
      return acc;
    });

    const uniqueCode = `${message.id}_${chat?.id}_${ca}`;
    matchRes.uniqueCode = uniqueCode;
    matchRes.token.address = ca;
    matchRes.token.symbol = symbol;
    matchRes.records = buyers
      .map((buyer) => {
        const url = entityMap[buyer]?.url;
        if (url) {
          const address = this.extractAddress(url);
          if (address) {
            return {
              address,
              name: buyer,
              type,
            };
          }
        }
      })
      .filter((record) => record);

    return matchRes;
  }

  static extractAddress(url) {
    const addressRegex = /https:\/\/gmgn\.ai\/sol\/address\/([A-Za-z0-9]+)/;
    const match = url.match(addressRegex);
    return match ? match[1] : null;
  }
}
