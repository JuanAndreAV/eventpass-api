// dto/inscribir-asistente.dto.ts
import {
  IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID, MaxLength, IsEnum,
} from 'class-validator';
import { TipoAsistente } from '../entities/asistente.entity';

export class InscribirAsistenteDto {
  @IsUUID() @IsNotEmpty()
  eventoId: string;

  @IsEnum(TipoAsistente)
  tipo: TipoAsistente;

  // Requerido solo si tipo === ESTUDIANTE
  @IsUUID() @IsOptional()
  estudianteId?: string;

  // Requeridos solo si tipo !== ESTUDIANTE (RED o EXTERNO)
  @IsString() @IsOptional() @MaxLength(20)
  documento?: string;

  @IsString() @IsOptional() @MaxLength(150)
  nombreCompleto?: string;

  @IsEmail() @IsOptional()
  email?: string;

  @IsString() @IsOptional() @MaxLength(20)
  telefono?: string;
}


