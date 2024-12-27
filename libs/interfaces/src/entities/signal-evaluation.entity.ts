import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Signal } from './signal.entity';

@Entity('signal_evaluation')
export class SignalEvaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  signalId: number;

  @ManyToOne(() => Signal, (signal) => signal.id)
  @JoinColumn({ name: 'signalId' })
  signal: Signal;

  @Column({ type: 'timestamp' })
  time: Date;

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
