import { PartialType } from '@nestjs/swagger';
import { CreateSignalDto } from './create-signal.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSignalDto extends PartialType(CreateSignalDto) {
  @ApiProperty({
    description:
      'All fields from CreateSignalDto are optional in UpdateSignalDto',
  })
  _note?: never;
}
