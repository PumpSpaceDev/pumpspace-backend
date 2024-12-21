import { Test, TestingModule } from '@nestjs/testing';
import { SignalRecorderController } from './signal-recorder.controller';
import { SignalRecorderService } from './signal-recorder.service';

describe('SignalRecorderController', () => {
  let signalRecorderController: SignalRecorderController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SignalRecorderController],
      providers: [SignalRecorderService],
    }).compile();

    signalRecorderController = app.get<SignalRecorderController>(
      SignalRecorderController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(signalRecorderController.getHello()).toBe('Hello World!');
    });
  });
});
