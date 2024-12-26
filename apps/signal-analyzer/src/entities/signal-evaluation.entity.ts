import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { EvaluationStatus } from '../dto/update-evaluation.dto';

@Entity('signal_evaluation')
@Index(['signalUniqueCode', 'evaluationTime'], { unique: true })
export class SignalEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  signalId: number;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  signalUniqueCode: string;

  @Index()
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

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  successRate: number;

  @Index()
  @Column({
    type: 'enum',
    enum: EvaluationStatus,
    default: EvaluationStatus.PENDING,
  })
  status: EvaluationStatus;
}
