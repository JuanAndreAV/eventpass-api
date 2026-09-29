import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTipoVehiculoDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  nombre: string;

  @IsInt() @Min(1)
  puestosMin: number;

  @IsInt() @Min(1)
  puestosMax: number;

  @IsBoolean() @IsOptional()
  activo?: boolean;
}

export class UpdateTipoVehiculoDto extends PartialType(CreateTipoVehiculoDto) {}
