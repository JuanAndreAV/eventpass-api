// inscripcion-red/dto/confirmar-inscripcion-red.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Paso 2 "de un clic" para quien el paso 1 (identificar) ya reconoció como
// estudiante o equipo interno: solo el documento — todo lo demás (nombre,
// tipo de documento, escuela, contacto, red/rol) se resuelve del lado del
// servidor a partir del registro ya existente.
export class ConfirmarInscripcionRedDto {
  @IsUUID()
  eventoId: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  documento: string;

  // Solo se pide/usa cuando el estudiante identificado tiene entre 10 y 13
  // años: no hay dato de acudiente en la tabla estudiantes, así que esto no
  // se puede autocompletar. El service avisa con ACUDIENTE_REQUERIDO cuando
  // hace falta y el frontend reintenta mandándolo.
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150)
  nombreAcudiente?: string;

  @IsOptional() @IsString() @MaxLength(100)
  comuna?: string;

  // Respuesta opcional a la pregunta personalizada del evento.
  @IsOptional() @IsString() @MaxLength(500)
  respuestaPregunta?: string;
}