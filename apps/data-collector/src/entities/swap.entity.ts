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
