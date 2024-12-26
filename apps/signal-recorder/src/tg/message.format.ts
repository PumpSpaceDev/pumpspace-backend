import { Api } from 'telegram';
import { Channel_Default } from './format/channel_default.format';
import { Channel_Gmgnsignals } from './format/channel_gmgnsignals.format';
import { Logger } from '@nestjs/common';

export interface TokenRecommond {
  uniqueCode: string;
  channelUsername: string;
  network: string;
  timestamp: number;
  token: {
    address: string;
    devAddress?: string;
    symbol?: string;
    price?: number;
    reserve?: number;
  };
  records: {
    address: string;
    type: string;
    amount?: number;
    name?: string;
    twitter?: string;
    telegram?: string;
    price?: number;
    addtionalInfo?: any;
  }[];
}

export interface MatchedEntity {
  entity: Api.TypeMessageEntity;
  matchedText: string;
}

export class MessageFormat {
  private readonly logger: Logger = new Logger(MessageFormat.name);

  async format(
    chatId: string,
    messages: Api.Message[],
  ): Promise<TokenRecommond[]> {
    const result: (TokenRecommond | null)[] = await Promise.all(
      messages.map(async (message) => {
        try {
          return await this.formatSingle(chatId, message);
        } catch (e) {
          this.logger.error(
            `Format messages error, chatId:${chatId}, Message: ${message.message}, error: ${e}`,
          );
          return [];
        }
      }),
    ).then((tokensRecommondArray) => tokensRecommondArray.flat());
    return result.filter((item) => item) as TokenRecommond[];
  }

  async formatSingle(
    chatId: string,
    message: Api.Message,
  ): Promise<TokenRecommond[]> {
    let result: TokenRecommond[] = [];
    const entities = this.matchEntity(message.message, message.entities || []);
    switch (chatId) {
      case 'gmgnsignals':
        const gmgnTokenRecommond = await Channel_Gmgnsignals.format(
          message,
          entities,
        );
        result = gmgnTokenRecommond ? [gmgnTokenRecommond] : [];
        break;

      default:
        const defaultTokenRecommond = await Channel_Default.format(
          message,
          entities,
        );
        result = defaultTokenRecommond ? [defaultTokenRecommond] : [];
        break;
    }

    if (!this.checkFormatResult(result)) {
      return [];
    }
    return result;
  }

  private checkFormatResult(result: TokenRecommond[]): boolean {
    if (result.length === 0) {
      return false;
    }
    for (const item of result) {
      if (item === null || item === undefined) {
        return false;
      }

      if (
        item.timestamp === undefined ||
        item.timestamp === null ||
        item.token.address === undefined ||
        item.token.address === null ||
        item.network === undefined ||
        item.network === null
      ) {
        return false;
      }
    }

    return true;
  }

  private matchEntity(
    message: string,
    entities: Api.TypeMessageEntity[],
  ): MatchedEntity[] {
    return entities
      .map((entity) => {
        const entityText = message.slice(
          entity.offset,
          entity.offset + entity.length,
        );
        return {
          entity,
          matchedText: entityText,
        };
      })
      .filter((item) => item !== null);
  }
}
