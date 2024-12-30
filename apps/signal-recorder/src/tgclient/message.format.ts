import { Api } from 'telegram';
import { Channel_Default } from './format/channel_default.format';
import { channel_Gmgnsignals } from './format/channel_gmgnsignals.format';
import { Logger } from '@nestjs/common';
import { Network } from '@app/interfaces';

export interface TokenRecommond {
  uniqueCode: string;
  channelUsername: string;
  network: Network; //"solana|ethereum|bsc|base"
  timestamp: number;
  token: {
    address: string;
    devAddress?: string;
    symbol?: string;
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

  /**
   *  Format messages
   * @param chatId
   * @param messages
   * @returns
   */
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

  /**
   *  Format single message
   * @param chatId
   * @param message
   * @returns
   */
  async formatSingle(
    chatId: string,
    message: Api.Message,
  ): Promise<TokenRecommond[]> {
    const entities = this.matchEntity(message.message, message.entities || []);
    let tokenRecommond: TokenRecommond | null = null;
    switch (chatId) {
      case 'gmgnsignals':
        tokenRecommond = await channel_Gmgnsignals.format(message, entities);
        break;

      // Add more channel format here...

      default:
        tokenRecommond = await Channel_Default.format(message, entities);
        break;
    }
    const result = tokenRecommond ? [tokenRecommond] : [];
    // check result, can not be null or undefined in result array
    if (!this.checkFormatResult(result)) {
      return [];
    }
    return result;
  }

  /**
   * Check format result
   * @param result
   * @returns boolean
   */
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

  /**
   *  Match entity
   * @param message string
   * @param entities  Api.TypeMessageEntity[]
   * @returns
   */
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