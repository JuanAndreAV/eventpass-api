import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateInstrumentoDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  nombre: string;

  @IsInt() @Min(0) @IsOptional()
  puestosAdicionales?: number;

  @IsBoolean() @IsOptional()
  activo?: boolean;
}

export class UpdateInstrumentoDto extends PartialType(CreateInstrumentoDto) {}
