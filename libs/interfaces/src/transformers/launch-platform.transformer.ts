import { ValueTransformer } from 'typeorm';
import { Platform } from '../enums';

export class LaunchPlatformTransformer implements ValueTransformer {
  to(value: Platform): string {
    return value.toString();
  }

  from(value: string): Platform {
    return Platform[value as keyof typeof Platform];
  }
}
