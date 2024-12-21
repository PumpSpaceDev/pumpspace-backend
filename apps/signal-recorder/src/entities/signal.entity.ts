import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('signal')
@Index(['uniqueCode'], { unique: true })
export class Signal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  uniqueCode: string;

  @Column({ type: 'varchar', length: 44 })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  symbol: string;

  @Column({ type: 'varchar', length: 50 })
  signal: string;

  @Column({ type: 'varchar', length: 50 })
  network: string;

  @Column('timestamp', { nullable: false })
  recommondTime: Date;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 20, scale: 10, nullable: true })
  reserve: number;

  @Column({ type: 'boolean', default: false })
  done: boolean;
}
