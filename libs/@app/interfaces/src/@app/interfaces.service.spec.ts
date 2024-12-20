import { Test, TestingModule } from '@nestjs/testing';
import { @app/interfacesService } from './@app/interfaces.service';

describe('@app/interfacesService', () => {
  let service: @app/interfacesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [@app/interfacesService],
    }).compile();

    service = module.get<@app/interfacesService>(@app/interfacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
