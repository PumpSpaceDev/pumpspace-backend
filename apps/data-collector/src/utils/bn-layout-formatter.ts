import { PublicKey } from '@solana/web3.js';
import { isObject } from 'lodash';
import BN from 'bn.js';

export class BnLayoutFormatter {
  static format(obj: any) {
    if (!obj) return obj;

    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      if (!value) continue;

      const constructor = value.constructor?.name;

      switch (constructor) {
        case 'PublicKey':
          obj[key] = (value as PublicKey).toBase58();
          break;
        case 'BN':
          obj[key] = (value as BN).toString();
          break;
        case 'BigInt':
          obj[key] = value.toString();
          break;
        case 'Buffer':
          obj[key] = (value as Buffer).toString('base64');
          break;
        default:
          if (isObject(value)) {
            BnLayoutFormatter.format(value);
          }
      }
    }

    return obj;
  }
}
