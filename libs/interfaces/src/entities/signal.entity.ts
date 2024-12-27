import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { MarketCapLevelTransformer } from '../transformers/market-cap-level.transformer';
import { MarketCapLevel } from '../enums/market-cap-level.enum';
import { EvaluationStatus, Network } from '../enums';
import { SignalNetworkTransformer } from '../transformers/signal-network.transformer';
import { EvaluationStatusTransformer } from '../transformers/evaluation-status.transformer';

@Entity('signal')
@Index(['signalName']) // Add index for signalName
export class Signal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false, length: 44 }) // Solana address max length is 44
  tokenAddress: string; // The token address for this push

  @Column({ type: 'varchar', nullable: true, length: 20 }) // Symbol is required, max length 20
  symbol: string;

  @Column({ type: 'varchar', nullable: false, length: 50 }) // Signal, max length 50
  signalName: string; // The name of the signal, there may be multiple records with the same signal name

  @Column({
    type: 'varchar',
    nullable: false,
    length: 50,
    transformer: new SignalNetworkTransformer(),
  }) // Network to which the address belongs, for example: solana, ethereum
  network: Network;

  @Column('timestamp', { nullable: false }) // Recommond time
  time: Date; // The time of a specific push

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  reserve: number;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    transformer: new MarketCapLevelTransformer(),
  })
  marketCapLevel: MarketCapLevel;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  averageScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  stdDeviation: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: EvaluationStatus.PENDING,
    transformer: new EvaluationStatusTransformer(),
  })
  evaluationStatus: EvaluationStatus; // The evaluation status of the signal
}
