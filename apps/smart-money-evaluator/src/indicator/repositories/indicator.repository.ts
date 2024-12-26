import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Indicator } from '../entities/indicator.entity';

@Injectable()
export class IndicatorRepository {
  constructor(
    @InjectRepository(Indicator)
    private readonly repository: Repository<Indicator>,
  ) {}

  async upsert(entity: Indicator, reload = false): Promise<Indicator> {
    return this.repository.save(entity, { reload });
  }
}
