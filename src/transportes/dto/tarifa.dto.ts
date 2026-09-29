import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateTarifaDto {
  @IsUUID()
  zonaId: string;

  @IsUUID()
  tipoVehiculoId: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  valor: number;

  @IsDateString({}, { message: 'vigenteDesde debe ser una fecha ISO (YYYY-MM-DD)' })
  vigenteDesde: string;

  @IsBoolean() @IsOptional()
  activa?: boolean;
}

export class UpdateTarifaDto extends PartialType(CreateTarifaDto) {}
