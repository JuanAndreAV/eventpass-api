// inscripcion-red/dto/confirmar-inscripcion-red.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { TipoDocumento } from '../../common/entity/persona-base.entity';

// Paso 2 "de un clic" para quien el paso 1 (identificar) ya reconoció como
// estudiante o equipo interno: solo documento + tipo, todo lo demás
// (nombre, escuela, contacto, red/rol) se resuelve del lado del servidor a
// partir del registro ya existente.
export class ConfirmarInscripcionRedDto {
  @IsUUID()
  eventoId: string;

  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;

  @IsString() @IsNotEmpty() @MaxLength(20)
  documento: string;

  // Solo se pide/usa cuando el estudiante identificado resulta ser menor de
  // edad: no hay dato de acudiente en la tabla estudiantes, así que esto no
  // se puede autocompletar. El service avisa con ACUDIENTE_REQUERIDO cuando
  // hace falta y el frontend reintenta mandándolo.
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  nombreAcudiente?: string;
}
