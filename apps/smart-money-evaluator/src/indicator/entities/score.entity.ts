import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('smart_money_score')
export class Score {
  @PrimaryColumn()
  address: string;

  @Column()
  time: Date;

  @Column('float')
  score: number;
}
