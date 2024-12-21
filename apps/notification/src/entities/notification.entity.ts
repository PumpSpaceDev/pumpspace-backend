import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ type: 'varchar', length: 44, nullable: true })
  walletAddress: string;

  @Column({ type: 'boolean', default: false })
  processed: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  channel: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
