import { Entity, Column, PrimaryColumn } from 'typeorm';
import { IndicatorName } from '../enums/indicator-name.enum';

@Entity('indicator')
export class Indicator {
  //TODO add base entity

  @PrimaryColumn()
  account: string;

  @PrimaryColumn()
  type: IndicatorName;

  @Column('float')
  value: number;

  @Column('float')
  score: number;
}
