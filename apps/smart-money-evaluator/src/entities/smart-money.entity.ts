import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('smart_money')
@Index(['address', 'network'], { unique: true })
export class SmartMoney {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44 })
  address: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string; // 地址昵称

  @Column({ type: 'varchar', length: 50 })
  network: string; // 网络类型 (如 Solana, Ethereum)

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
