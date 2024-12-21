import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  Check,
} from 'typeorm';
import { SwapDirection } from '../enums';

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

  @Column({
    type: 'enum',
    enum: SwapDirection,
    enumName: 'swap_direction_enum',
  })
  direction: SwapDirection; // Transaction direction (BUY/SELL)

  @Column({ type: 'numeric', precision: 78, scale: 0 })
  @Check('amount_in >= 0')
  amountIn: bigint; // Input amount

  @Column({ type: 'numeric', precision: 78, scale: 0 })
  @Check('amount_out >= 0')
  amountOut: bigint; // Output amount

  @Column({ type: 'varchar', length: 100 })
  @Index()
  market: string; // Trading pair information (e.g., "SOL/USDC")
}
