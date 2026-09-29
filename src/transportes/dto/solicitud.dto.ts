import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';

export class CreateSolicitudDto {
  @IsUUID()
  cicloId: string;

  // El solicitante se identifica con su documento: debe existir como estudiante registrado.
  @IsString() @IsNotEmpty() @MaxLength(20)
  documento: string;

  @IsUUID()
  agrupacionId: string;

  @IsBoolean()
  llevaInstrumento: boolean;

  @IsUUID() @IsOptional()
  instrumentoId?: string;

  // Solo lo aceptan las agrupaciones con `permiteAcompanante`.
  @IsBoolean() @IsOptional()
  llevaAcompanante?: boolean;

  @IsBoolean()
  requiereIda: boolean;

  @IsUUID() @IsOptional()
  escuelaSalidaId?: string;

  @IsBoolean()
  requiereRegreso: boolean;

  @IsUUID() @IsOptional()
  escuelaLlegadaId?: string;

  @IsString() @IsOptional() @MaxLength(20)
  telefonoContacto?: string;

  @IsString() @IsOptional() @MaxLength(20)
  telefonoAcudiente?: string;

  @IsString() @IsOptional()
  observacion?: string;
}

export class UpdateSolicitudDto extends PartialType(CreateSolicitudDto) {}

export class RechazarSolicitudDto {
  @IsString() @IsOptional()
  motivoRechazo?: string;
}
