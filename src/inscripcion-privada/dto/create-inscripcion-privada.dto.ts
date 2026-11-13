import {
  IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID,
  Matches, Max, MaxLength, Min,
} from 'class-validator';

// ---------- Públicos (se llaman con el token del enlace) ----------

export class InscribirEscuelaDto {
  @IsUUID()
  escuelaId: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  nombre: string;

  // Solo letras y números: cubre cédula, tarjeta de identidad, extranjería y pasaporte
  @IsString() @Matches(/^[A-Za-z0-9]{4,20}$/, { message: 'Documento no válido' })
  documento: string;

  @IsEmail() @MaxLength(150)
  correo: string;

  // El tope real por persona (si existe) lo valida el servicio desde la configuración
  @IsInt() @Min(1) @Max(200)
  cantidadBoletas: number;
}

export class InscribirAgrupacionDto {
  @IsString() @Matches(/^[A-Za-z0-9]{4,20}$/, { message: 'Documento no válido' })
  documento: string;
}

// ---------- Administración ----------

export class CrearConfiguracionDto {
  @IsOptional() @IsInt() @Min(0)
  cupoPorEscuelaDefecto?: number;

  // null = sin tope por persona
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