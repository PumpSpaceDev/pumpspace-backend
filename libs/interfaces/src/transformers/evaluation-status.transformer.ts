import { EvaluationStatus } from '../enums/evaluation-status.enum';
import { ValueTransformer } from 'typeorm';

export class EvaluationStatusTransformer implements ValueTransformer {
  to(value: EvaluationStatus): string {
    return value;
  }

  from(value: string): EvaluationStatus {
    return EvaluationStatus[value as keyof typeof EvaluationStatus];
  }
}
