import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltrosInformesDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mesId: number;
}