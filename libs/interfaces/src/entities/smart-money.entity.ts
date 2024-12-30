import { Entity, Column, Index, PrimaryColumn } from 'typeorm';
import { NetworkTransformer } from '../transformers';
import { Network } from '../enums';
import { SmartMoneyType } from '../enums';
import { SmartMoneyTypeTransformer } from '../transformers';

@Entity('smart_money')
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

  /**
   * the avatar of the address, used to display the avatar of the address in the UI
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  avatar: string;

  @Column({ type: 'int', default: 4 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  syncStatus: boolean;

  /**
   * the type of address, for example: kol, dev
   */
  @Column({
    type: 'varchar',
    length: 16,
    nullable: true,
    default: 'other',
    transformer: new SmartMoneyTypeTransformer(),
  })
  type: SmartMoneyType;
}
