import { Score } from '@app/interfaces';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ScoreRepository {
  constructor(
    @InjectRepository(Score)
    private readonly repository: Repository<Score>,
  ) {}

  async add(entity: Partial<Score>): Promise<Score> {
    return this.repository.save(entity);
  }
}
