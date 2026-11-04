// inscripcion-red/dto/create-inscripcion-red.dto.ts
import {
  IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min,
  ValidateIf,
} from 'class-validator';
import { RedPrograma } from '../../asistentes/entities/asistente.entity';
import { TipoDocumento } from '../../common/entity/persona-base.entity';

// Roles válidos por red. El rol en sí se guarda como string libre en la
// entidad (ver su comentario), pero la lista permitida depende de `red`,
// así que se valida aquí contra estas dos listas en vez de un solo @IsEnum.
export enum RolMusica {
  PARTICIPANTE = 'PARTICIPANTE',
  ARTISTA_FORMADOR = 'ARTISTA_FORMADOR',
  EQUIPO_GESTION = 'EQUIPO_GESTION',
  EQUIPO_COORDINADOR = 'EQUIPO_COORDINADOR',
  APOYO_ADMINISTRATIVO = 'APOYO_ADMINISTRATIVO',
  LABORATORIO_RED = 'LABORATORIO_RED',
}

export enum RolRpac {
  PARTICIPANTE = 'PARTICIPANTE',
  ARTISTA_FORMADOR = 'ARTISTA_FORMADOR',
  COORDINADOR = 'COORDINADOR',
  APOYO_ADMINISTRATIVO = 'APOYO_ADMINISTRATIVO',
  OTRO = 'OTRO',
}

export class CreateInscripcionRedDto {
  @IsUUID()
  eventoId: string;

  @IsEnum(RedPrograma)
  red: RedPrograma;

  // Se valida contra RolMusica o RolRpac según `red` en el service (no se
  // puede expresar "uno de estos dos enums según otro campo" con un solo
  // decorador declarativo limpio).
  @IsString() @IsNotEmpty() @MaxLength(50)
  rol: string;

  // Solo cuando red=RPAC y rol=OTRO.
  @ValidateIf((o) => o.red === RedPrograma.RPAC && o.rol === RolRpac.OTRO)
  @IsString() @IsNotEmpty({ message: 'Indica cuál es tu rol' }) @MaxLength(150)
  rolOtro?: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  nombre: string;

  // Opcional en el DTO para que confirmar() pueda llamar a crear() sin él
  // (en ese caso sale del registro del estudiante / equipo interno). El
  // formulario completo del frontend sí lo exige.
  @IsOptional() @IsEnum(TipoDocumento)
  tipoDocumento?: TipoDocumento;

  @IsString() @IsNotEmpty() @MaxLength(20)
  documento: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  escuela: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  celular: string;

  @IsEmail()
  correo: string;

  // Opcional: equipo interno y RPAC no la piden ni la necesitan. Para los
  // demás roles de Música sí es obligatoria — eso se valida en el service
  // (determinarCategoria), no aquí, porque depende de `rol`.
  @IsOptional() @IsInt() @Min(0) @Max(120)
  edad?: number;

  // Obligatorio solo cuando red=MUSICA y la edad está entre 10 y 13. Si se
  // envía en cualquier otro caso, igual se valida (string no vacío, máx.
  // 150): sin la segunda condición del ValidateIf, un valor mal formado
  // pasaría sin revisión cuando la edad queda fuera del rango.
  @ValidateIf(
    (o) =>
      (o.red === RedPrograma.MUSICA && o.edad != null && o.edad >= 10 && o.edad <= 13) ||
      o.nombreAcudiente != null,
  )
  @IsString() @IsNotEmpty({ message: 'Indica el nombre del acudiente' }) @MaxLength(150)
  nombreAcudiente?: string;

  @IsOptional() @IsString() @MaxLength(100)
  comuna?: string;

  // Respuesta opcional a la pregunta personalizada del evento.
  @IsOptional() @IsString() @MaxLength(500)
  respuestaPregunta?: string;
}