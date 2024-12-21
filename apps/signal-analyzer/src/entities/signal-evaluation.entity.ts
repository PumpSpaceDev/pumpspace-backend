import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('signal_evaluation')
@Index(['signalId'], { unique: true })
export class SignalEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  signalId: number;

  @Column({ type: 'decimal', precision: 20, scale: 10 })
  entryPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  exitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  profitLoss: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  roi: number;

  @Column({ type: 'int' })
  holdingPeriod: number;

  @Column({
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  evaluationTime: Date;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
