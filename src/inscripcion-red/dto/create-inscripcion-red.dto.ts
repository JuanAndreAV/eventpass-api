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

  @IsEnum(TipoDocumento)
  tipoDocumento: TipoDocumento;

  @IsString() @IsNotEmpty() @MaxLength(20)
  documento: string;

  @IsString() @IsNotEmpty() @MaxLength(150)
  escuela: string;

  @IsString() @IsNotEmpty() @MaxLength(20)
  celular: string;

  @IsEmail()
  correo: string;

  // Opcional: equipo interno no tiene de dónde sacar una edad real (ver
  // comentario en la entidad) y no la necesita para nada. Para los demás
  // roles de Música sí es obligatoria — eso se valida en el service
  // (determinarCategoria), no aquí, porque depende de `rol`.
  @IsOptional() @IsInt() @Min(0) @Max(120)
  edad?: number;

  // Solo cuando red=MUSICA y es menor de edad (edad < 18). RPAC no pide
  // acudiente porque el formulario original solo hace esa pregunta en Música.
  @ValidateIf((o) => o.red === RedPrograma.MUSICA && o.edad != null && o.edad < 18)
  @IsString() @IsNotEmpty({ message: 'Indica el nombre del acudiente' }) @MaxLength(150)
  nombreAcudiente?: string;
}
