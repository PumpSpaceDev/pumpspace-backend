import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';

@Injectable()
export class ScoreRepository {
  constructor(
    @InjectRepository(Score)
    private readonly repository: Repository<Score>,
  ) {}

  async add(entity: Score): Promise<Score> {
    return this.repository.save(entity);
  }
}
