import { EvaluationStatus } from '../enums/evaluation-status.enum';
import { ValueTransformer } from 'typeorm';

export class EvaluationStatusTransformer implements ValueTransformer {
  to(value: EvaluationStatus): string {
    return value;
  }

  from(value: string): EvaluationStatus {
    if (!Object.values(EvaluationStatus).includes(value as EvaluationStatus)) {
      throw new Error(
        `Invalid EvaluationStatus value: ${value}. Expected one of ${Object.values(
          EvaluationStatus,
        ).join(', ')}`,
      );
    }
    return EvaluationStatus[value as keyof typeof EvaluationStatus];
  }
}
