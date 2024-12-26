import { Api } from 'telegram';
import { MatchedEntity, TokenRecommond } from '../message.format';
import { Network } from '@app/interfaces/enums/network.enum';
import {
  ADDRESSTYPE_KOL,
  ADDRESSTYPE_SMARTMONEY,
  ADDRESSTYPE_OTHER,
  NETWORK_SOLANA,
} from '../constants';

export class Channel_Gmgnsignals {
  static async format(
    message: Api.Message,
    entities: MatchedEntity[],
  ): Promise<TokenRecommond | null> {
    const text = message.message;
    const chat: any = await message.getChat();
    const matchRes = {
      uniqueCode: '',
      channelUsername: chat?.username || chat?.id,
      network: Network[NETWORK_SOLANA.toUpperCase() as keyof typeof Network],
      timestamp: message.date,
      token: {
        address: '',
        devAddress: '',
      },
      records: [],
    } as TokenRecommond;

    let type = ADDRESSTYPE_OTHER;
    const typeRegex = /(KOL|Smart Money)\sBuy/;
    const typeText = (text.match(typeRegex) || [])[1];
    if (typeText == 'KOL') {
      type = ADDRESSTYPE_KOL;
    } else if (typeText == 'Smart Money') {
      type = ADDRESSTYPE_SMARTMONEY;
    } else {
      return null;
    }

    const caRegex = /\$[A-Za-z]+\([^)]+\)\n([A-Za-z0-9]+)/;
    const symbolRegex = /\$([A-Za-z]+)\(/;

    const ca = (text.match(caRegex) || [])[1];
    const symbol = (text.match(symbolRegex) || [])[1];
    let buyers = [];
    if (type === ADDRESSTYPE_KOL) {
      const kolBuyersRegex = /^(.*?)\s+\d+[a-z]+\sago/gm;
      buyers = [...text.matchAll(kolBuyersRegex)].map((match) =>
        match[1].trim(),
      );
    } else if (type === ADDRESSTYPE_SMARTMONEY) {
      const smartMoneyBuyersRegex = /^([A-Za-z0-9.]+)\s+\d+[a-z]+\sago/gm;
      buyers = [...text.matchAll(smartMoneyBuyersRegex)].map((match) =>
        match[1].trim(),
      );
    }

    const entityMap = entities.reduce(
      (acc, item) => {
        acc[item.matchedText] = item.entity;
        return acc;
      },
      {} as Record<string, any>,
    );

    const uniqueCode = `${message.id}_${chat?.id}_${ca}`;
    matchRes.uniqueCode = uniqueCode;
    matchRes.token.address = ca;
    matchRes.token.symbol = symbol;
    matchRes.records = buyers
      .map((buyer) => {
        const url = entityMap[buyer]?.url;
        if (url) {
          const address = Channel_Gmgnsignals.extractAddress(url);
          if (address) {
            return {
              address,
              name: buyer,
              type,
            };
          }
        }
      })
      .filter(
        (record): record is NonNullable<typeof record> => record !== null,
      );

    return matchRes;
  }

  static extractAddress(url: string): string | null {
    const addressRegex = /https:\/\/gmgn\.ai\/sol\/address\/([A-Za-z0-9]+)/;
    const match = url.match(addressRegex);
    return match ? match[1] : null;
  }
}
