import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString,
  Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ---------- Públicos (se llaman con el token del enlace) ----------

// Solo letras y números: cubre cédula, tarjeta de identidad, extranjería y pasaporte
const DOCUMENTO = /^[A-Za-z0-9]{4,20}$/;

export class AcompananteDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  nombre: string;

  @IsString() @Matches(DOCUMENTO, { message: 'Documento de acompañante no válido' })
  documento: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  comuna: string;
}

// El estudiante ya fue preinscrito por su escuela (Excel del director): aquí
// confirma con su documento, deja correo y comuna, y registra acompañantes.
export class InscribirEscuelaDto {
  @IsString() @Matches(DOCUMENTO, { message: 'Documento no válido' })
  documento: string;

  @IsEmail() @MaxLength(150)
  correo: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  comuna: string;

  // Hasta las boletas que le asignó el director en el Excel; lo valida el servicio
  @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => AcompananteDto)
  acompanantes: AcompananteDto[];
}

export class InscribirAgrupacionDto {
  @IsString() @Matches(DOCUMENTO, { message: 'Documento no válido' })
  documento: string;

  @IsOptional() @IsEmail() @MaxLength(150)
  correo?: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  comuna: string;

  // Fijo: boletasPorParticipante - 1 (hoy 1, el acudiente). Lo valida el servicio.
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AcompananteDto)
  acompanantes: AcompananteDto[];
}

// ---------- Administración ----------

export class CrearConfiguracionDto {
  @IsOptional() @IsInt() @Min(0)
  cupoPorEscuelaDefecto?: number;

  // Escuelas: tope de boletas por persona (estudiante + acompañantes). null = sin tope.
  @IsOptional() @IsInt() @Min(1)
  topeBoletasPorPersona?: number | null;

  @IsOptional() @IsInt() @Min(1)
  boletasPorParticipante?: number;

  @IsOptional() @IsBoolean()
  escuelasHabilitadas?: boolean;

  @IsOptional() @IsBoolean()
  agrupacionesHabilitadas?: boolean;
}

export class ActualizarConfiguracionDto extends CrearConfiguracionDto {
  @IsOptional() @IsBoolean()
  activa?: boolean;
}

export class ActualizarCupoDto {
  @IsInt() @Min(0)
  cupo: number;
}

export class CrearEventoPrivadoDto extends CrearConfiguracionDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  nombre: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  lugar: string;

  // Con zona horaria, por ejemplo 2026-12-05T18:00:00-05:00
  @IsDateString()
  fechaInicio: string;

  @IsOptional() @IsString() @MaxLength(2000)
  descripcion?: string;
}

export class ActualizarTodosCuposDto {
  @IsInt() @Min(0)
  cupo: number;
}