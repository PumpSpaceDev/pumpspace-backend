// PumpSpace 最终版 TypeORM Entity 开发建议

// 1. Swaps 表：存储所有 Raydium 相关交易数据
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('swaps')
@Index(['signer'])
@Index(['amm'])
@Index(['amm', 'timestamp'])
export class Swap {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 88, unique: true })
  signature: string; // 交易签名，唯一标识

  @CreateDateColumn()
  timestamp: Date; // 交易时间

  @Column({ type: 'char', length: 44 })
  signer: string; // 发起交易的钱包地址

  @Column({ type: 'char', length: 44 })
  amm: string; // 交易的 AMM 地址

  @Column({ type: 'int' })
  direction: number; // 交易方向 (0: buy, 1: sell)

  @Column({ type: 'bigint' })
  amountIn: bigint; // 输入的交易量

  @Column({ type: 'bigint' })
  amountOut: bigint; // 输出的交易量
}

// 2. SmartMoney 表：存储聪明钱地址及其基本信息
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

// 3. SmartMoneyScore 表：存储聪明钱的多次评分
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMoney } from './smartMoney.entity';

@Entity('smart_money_score')
@Index(['address', 'time'], { unique: true })
export class Score {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 44 })
  @Index()
  address: string;

  @Column({ type: 'bigint' })
  solBalance: bigint;

  @Column({ type: 'timestamp' })
  time: Date;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  score: number;

  @ManyToOne(() => SmartMoney, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'address', referencedColumnName: 'address' })
  smartMoney: SmartMoney;
}

// 4. Signal 表：存储信号推荐记录
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('signal')
@Index(['uniqueCode'], { unique: true })
export class Signal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  uniqueCode: string;

  @Column({ type: 'varchar', length: 44 })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  symbol: string;

  @Column({ type: 'varchar', length: 50 })
  signal: string;

  @Column({ type: 'varchar', length: 50 })
  network: string;

  @Column('timestamp', { nullable: false })
  recommondTime: Date;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  reserve: number;

  @Column({ type: 'boolean', default: false })
  done: boolean;
}

// 5. SignalEvaluation 表：存储信号的多次评估结果
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('signal_evaluation')
@Index(['signalUniqueCode', 'evaluationTime'], { unique: true })
export class SignalEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  signalUniqueCode: string;

  @Column({ type: 'timestamp' })
  evaluationTime: Date;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: false })
  priceChange: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: false })
  reserveChange: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: false })
  marketCap: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: false })
  priceWeight: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: false })
  reserveWeight: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: false })
  compositeScore: number;
}

// 6. TokenBuckets 表：存储 Redis 的分桶数据持久化信息
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

  @Column({ type: 'decimal', precision: 20, scale: 10 })
  bucketVolume: number;

  @Column({ type: 'decimal', precision: 20, scale: 10 })
  bucketPrice: number;

  @Column({ type: 'timestamp' })
  lastUpdated: Date;
}
