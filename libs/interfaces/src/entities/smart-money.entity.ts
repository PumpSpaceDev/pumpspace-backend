import { Entity, Column, Index, PrimaryColumn } from 'typeorm';
import { NetworkTransformer } from '../transformers';
import { Network } from '../enums';

@Entity('smart_money')
@Index(['address'], { unique: true })
@Index(['priority', 'syncStatus'])
@Index(['lastSyncedAt'])
export class SmartMoney {
  @PrimaryColumn({ type: 'varchar', length: 44 })
  address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
    transformer: new NetworkTransformer(),
  })
  network: Network[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitterHandle: string;

  @Column({ type: 'int', default: 4 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  syncStatus: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date;

  @Column({ type: 'varchar', length: 128, nullable: true })
  firstBeforeTxSignature: string;
}
