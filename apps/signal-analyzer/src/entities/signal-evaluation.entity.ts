import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('signal_evaluation')
@Index(['signalUniqueCode', 'evaluationTime'], { unique: true })
export class SignalEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  signalId: number;

  @Column({ type: 'varchar', length: 100 })
  signalUniqueCode: string;

  @Column({ type: 'timestamp' })
  evaluationTime: Date;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: false })
  entryPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  exitPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  profitLoss: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  roi: number;

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

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'completed' | 'failed';
}
