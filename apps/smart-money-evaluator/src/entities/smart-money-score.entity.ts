import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SmartMoney } from './smart-money.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('smart_money_score')
@Index(['address', 'time'], { unique: true })
@Index(['time'])
@Index(['score'])
export class SmartMoneyScore {
  @ApiProperty({ description: 'Unique identifier', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Wallet address',
    example: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
  })
  @Column({ type: 'varchar', length: 44 })
  @Index()
  address: string;

  @ApiProperty({
    description: 'SOL balance in lamports',
    example: '1000000000',
  })
  @Column({ type: 'bigint' })
  solBalance: bigint;

  @ApiProperty({ description: 'Score calculation timestamp' })
  @Column({ type: 'timestamp' })
  time: Date;

  @ApiProperty({
    description: 'Smart money score (0-100)',
    example: 75.5,
    minimum: 0,
    maximum: 100,
  })
  @Column({ type: 'decimal', precision: 18, scale: 8 })
  score: number;

  @ManyToOne(() => SmartMoney, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'address', referencedColumnName: 'address' })
  smartMoney: SmartMoney;
}
