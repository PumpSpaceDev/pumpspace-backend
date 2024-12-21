import { Test, TestingModule } from '@nestjs/testing';
import { DataCollectorController } from './data-collector.controller';
import { DataCollectorService } from './data-collector.service';

describe('DataCollectorController', () => {
  let dataCollectorController: DataCollectorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [DataCollectorController],
      providers: [DataCollectorService],
    }).compile();

    dataCollectorController = app.get<DataCollectorController>(
      DataCollectorController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(dataCollectorController.getHello()).toBe('Hello World!');
    });
  });
});
