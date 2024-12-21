import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { SharedModule } from '@app/shared';
import { DataCollectorController } from './data-collector.controller';
import { DataCollectorService } from './data-collector.service';
import { SwapEntity } from './entities/swap.entity';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule,
    SharedModule,
    TypeOrmModule.forFeature([SwapEntity]),
    ClientsModule.registerAsync([
      {
        name: 'SHYFT_PACKAGE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'shyft',
            protoPath: join(__dirname, '../proto/shyft.proto'),
            url: configService.shyftConfig.endpoint,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [DataCollectorController],
  providers: [DataCollectorService],
})
export class DataCollectorModule {}
