import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';
import { EstadoCiclo } from '../entities/ciclo.entity';

export class CreateCicloDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  nombre: string;

  @IsDateString({}, { message: 'fechaEvento debe ser una cadena ISO 8601 válida' })
  fechaEvento: string;

  @IsString() @IsNotEmpty() @MaxLength(200)
  destino: string;

  @IsDateString({}, { message: 'fechaCierre debe ser una cadena ISO 8601 válida' })
  fechaCierre: string;

  @IsArray() @IsUUID('all', { each: true })
  agrupacionesIds: string[];

  @IsString() @IsOptional() @MaxLength(200)
  horaRecogida?: string;

  @IsString() @IsOptional() @MaxLength(200)
  horaRegreso?: string;

  @IsString() @IsOptional()
  observaciones?: string;
}

export class UpdateCicloDto extends PartialType(CreateCicloDto) {}

export class CambiarEstadoCicloDto {
  @IsEnum(EstadoCiclo)
  estado: EstadoCiclo;
}
