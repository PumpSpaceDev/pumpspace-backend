import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('token_buckets')
@Index(['tokenId', 'bucketKey'], { unique: true })
export class TokenBucket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44 })
  tokenId: string;

  @Column({ type: 'varchar', length: 50 })
  bucketKey: string; // 分桶标识

  @Column({ type: 'decimal', precision: 20, scale: 10, unsigned: true })
  bucketVolume: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, unsigned: true })
  priceReciprocal: number;

  @Column({ type: 'bigint', default: 0, unsigned: true })
  transactionCount: number;

  @Index()
  @Column({ type: 'timestamp' })
  lastUpdated: Date;
}
