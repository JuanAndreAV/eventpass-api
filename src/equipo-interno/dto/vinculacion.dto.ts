// equipo-interno/dto/vinculacion.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import {
  IsDateString, IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';
import { Dedicacion, EstadoVinculacion, FormaPago, TipoVinculacion } from '../entities/vinculacion.entity';
import { GrupoCargo } from '../entities/cargo.entity';

export class CreateVinculacionDto {
  @IsUUID()
  personaId: string;

  @IsUUID()
  cargoId: string;

  @IsUUID()
  contratoInteradministrativoId: string;

  @IsUUID() @IsOptional()
  objetoContratoId?: string;

  @IsUUID() @IsOptional()
  justificacionId?: string;

  @IsUUID() @IsOptional()
  perfilFuncionId?: string;

  @IsEnum(GrupoCargo)
  grupo: GrupoCargo;

  @IsEnum(TipoVinculacion)
  tipoVinculacion: TipoVinculacion;

  @IsEnum(Dedicacion) @IsOptional()
  dedicacion?: Dedicacion;

  @IsEnum(FormaPago) @IsOptional()
  formaPago?: FormaPago;

  @IsDateString() @IsOptional()
  fechaInicio?: string;

  @IsDateString() @IsOptional()
  fechaFin?: string;

  @IsNumberString() @IsOptional()
  monto?: string;

  @IsString() @IsOptional() @MaxLength(100)
  horario?: string;

  @IsEnum(EstadoVinculacion)
  estadoVinculacion: EstadoVinculacion;
}

export class UpdateVinculacionDto extends PartialType(CreateVinculacionDto) {}
