import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';

export class CreateRutaDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  nombre: string;

  @IsString() @IsNotEmpty() @MaxLength(50)
  codigo: string;

  @IsUUID()
  zonaId: string;

  // La ruta hace un único recorrido y no admite trayecto de regreso.
  @IsBoolean() @IsOptional()
  soloIda?: boolean;

  @IsBoolean() @IsOptional()
  activa?: boolean;
}

export class UpdateRutaDto extends PartialType(CreateRutaDto) {}

export class AsignarEscuelasRutaDto {
  @IsArray() @IsUUID('all', { each: true })
  escuelasIds: string[];
}
