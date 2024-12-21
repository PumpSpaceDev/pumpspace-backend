import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('swaps')
@Index(['signer'])
@Index(['amm'])
@Index(['amm', 'timestamp'])
export class SwapEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 88, unique: true })
  signature: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'char', length: 44 })
  signer: string;

  @Column({ type: 'char', length: 44 })
  amm: string;

  @Column({ type: 'int' })
  direction: number;

  @Column({ type: 'bigint' })
  amountIn: string;

  @Column({ type: 'bigint' })
  amountOut: string;
}
