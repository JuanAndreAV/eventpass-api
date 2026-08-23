// dto/registrar-acceso.dto.ts
import {
  IsEnum, IsOptional, IsString, IsUUID, ValidateIf,
} from 'class-validator';
import { MetodoLectura } from '../entities/acceso-log.entity';

export class RegistrarAccesoDto {
  @IsEnum(MetodoLectura)
  metodoLectura: MetodoLectura;

  @IsString()
  valor: string; // el UID NFC, el token QR, o el número de documento leído

  // Si el acceso es a un evento con inscripción (concierto), este es requerido
  @IsUUID() @IsOptional()
  asistenteId?: string;

  // Si el acceso es de asistencia escolar diaria, este es requerido
  @IsUUID() @IsOptional()
  escuelaId?: string;

  // El vigilante autenticado que hace el escaneo
  @IsUUID() @IsOptional()
  operadorId?: string;
}
