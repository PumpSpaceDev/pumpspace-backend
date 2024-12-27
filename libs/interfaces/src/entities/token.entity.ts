import { Column, PrimaryColumn, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Platform } from '../enums';
import { LaunchPlatformTransformer } from '../transformers/launch-platform.transformer';

@Entity('tokens')
export class Token extends BaseEntity {
  @PrimaryColumn({ length: 44 }) // Solana address max length is 44
  address: string;

  @Column({ length: 44, nullable: true }) // Solana address max length is 44
  amm: string;

  @Column('int', { nullable: true, default: 0 }) // Transaction count for a specific AMM, default is 0
  amm_transaction_count: number;

  @Column({ nullable: false, length: 100 }) // Name is required, max length 100
  name: string;

  @Column({ nullable: false, length: 20 }) // Symbol is required, max length 20
  symbol: string;

  @Column({ nullable: true, length: 255 }) // Icon URL, max length 255
  icon: string;

  @Column({ nullable: true, length: 255 }) // token metadata url for base info
  uri: string;

  @Column({
    type: 'varchar',
    nullable: true,
    default: Platform.Unknown,
    transformer: new LaunchPlatformTransformer(),
  })
  launch_platform: Platform;

  @Column('int')
  decimals: number;

  @Column('bigint')
  holder: number;

  @Column({ nullable: true, length: 44 }) // Creator address max length is 44
  creator: string;

  @Column({ nullable: true, length: 100 }) // Create transaction hash max length is 100
  create_tx: string;

  @Column('timestamp', { nullable: true }) // Use Date for created time
  created_time: Date;

  @Column({ nullable: true, length: 100 }) // First mint transaction hash max length is 100
  first_mint_tx: string;

  @Column('timestamp', { nullable: true }) // Use Date for first mint time
  first_mint_time: Date;

  @Column('varchar', { length: 50 }) // Supply as string due to large numbers
  supply: string;

  @Column('decimal', { precision: 20, scale: 10, nullable: true }) // High precision for price
  price: number;

  @Column('decimal', { precision: 20, scale: 10, nullable: true }) // High precision for market cap
  market_cap: number;
}
