import { Module } from '@nestjs/common';
import { ConfigModule } from '@app/config';
import { SharedService } from './shared.service';

@Module({
  imports: [ConfigModule],
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}
