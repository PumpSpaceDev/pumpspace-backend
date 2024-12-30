import { ValueTransformer } from 'typeorm';
import { Platform } from '../enums';

export class LaunchPlatformTransformer implements ValueTransformer {
  to(value: Platform): string {
    return value.toString();
  }

  from(value: string): Platform {
    if (!Object.values(Platform).includes(value as Platform)) {
      throw new Error(
        `Invalid Platform value: ${value}. Expected one of ${Object.values(
          Platform,
        ).join(', ')}`,
      );
    }
    return Platform[value as keyof typeof Platform];
  }
}
