import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMoney } from './smart-money.entity';

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
