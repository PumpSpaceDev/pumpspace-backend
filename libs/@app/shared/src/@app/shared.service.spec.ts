import { Test, TestingModule } from '@nestjs/testing';
import { @app/sharedService } from './@app/shared.service';

describe('@app/sharedService', () => {
  let service: @app/sharedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [@app/sharedService],
    }).compile();

    service = module.get<@app/sharedService>(@app/sharedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
