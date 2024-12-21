import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IsString, IsEnum, IsObject, IsBoolean, IsNumber, Length, Matches, ValidateNested, Min, Max } from 'class-validator';

@Entity('notifications')
@Index(['walletAddress', 'processed'])
@Index(['type', 'processed'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsEnum(['SMART_MONEY_MATCH'])
  type: string;

  @Column({ type: 'jsonb' })
  @IsObject()
  @ValidateNested()
  data: Record<string, any>;

  @Column({ type: 'varchar', length: 44, nullable: true })
  @IsString()
  @Length(32, 44)
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  walletAddress: string;

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  processed: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsString()
  @IsEnum(['smart-money'])
  channel: string;

  @Column({ type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  @Max(5)
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
