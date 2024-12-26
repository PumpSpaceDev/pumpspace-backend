import { Entity, Column, PrimaryColumn } from 'typeorm';
import { IndicatorName } from '@app/interfaces';

@Entity('indicator')
export class Indicator {
  @PrimaryColumn()
  account: string;

  @PrimaryColumn()
  type: IndicatorName;

  @Column('float')
  value: number;

  @Column('float')
  score: number;
}
