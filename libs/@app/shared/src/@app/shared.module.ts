import { Module } from '@nestjs/common';
import { @app/sharedService } from './@app/shared.service';

@Module({
  providers: [@app/sharedService],
  exports: [@app/sharedService],
})
export class @app/sharedModule {}
