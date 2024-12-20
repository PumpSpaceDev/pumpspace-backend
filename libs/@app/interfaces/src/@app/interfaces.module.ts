import { Module } from '@nestjs/common';
import { @app/interfacesService } from './@app/interfaces.service';

@Module({
  providers: [@app/interfacesService],
  exports: [@app/interfacesService],
})
export class @app/interfacesModule {}
