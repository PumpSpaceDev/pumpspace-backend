import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Signal } from '@app/shared/entities';

@Injectable()
export class SignalRepository extends Repository<Signal> {
  constructor(private dataSource: DataSource) {
    super(Signal, dataSource.createEntityManager());
  }

  async findByUniqueCode(uniqueCode: string): Promise<Signal | null> {
    return this.findOne({ where: { uniqueCode } });
  }

  async findPendingSignals(): Promise<Signal[]> {
    return this.find({
      where: { done: false },
      order: { createdAt: 'ASC' },
    });
  }
}
