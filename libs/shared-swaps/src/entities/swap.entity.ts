import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('swaps')
@Index(['signer'])
@Index(['amm'])
@Index(['amm', 'timestamp'])
export class Swap {
  @PrimaryColumn({ type: 'char', length: 88 })
  signature: string;

  @PrimaryColumn({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'char', length: 44 })
  signer: string;

  @Column({ type: 'char', length: 44 })
  amm: string;

  @Column({ type: 'int' })
  direction: number;

  @Column({ type: 'bigint', name: 'amount_in' })
  amountIn: string;

  @Column({ type: 'bigint', name: 'amount_out' })
  amountOut: string;
}
