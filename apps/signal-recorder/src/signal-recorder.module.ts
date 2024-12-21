import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@app/config';
import { SignalRecorderController } from './signal-recorder.controller';
import { SignalRecorderService } from './signal-recorder.service';
import { Signal } from './entities/signal.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.getDatabaseConfig(),
        entities: [Signal],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Signal]),
  ],
  controllers: [SignalRecorderController],
  providers: [SignalRecorderService],
})
export class SignalRecorderModule {}
