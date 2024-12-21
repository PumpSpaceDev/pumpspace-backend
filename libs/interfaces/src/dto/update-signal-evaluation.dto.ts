import { PartialType } from '@nestjs/mapped-types';
import { CreateSignalEvaluationDto } from './create-signal-evaluation.dto';

export class UpdateSignalEvaluationDto extends PartialType(
  CreateSignalEvaluationDto,
) {}
