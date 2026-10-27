import { Transform } from "class-transformer";
import { IsUUID, IsInt, IsDateString, IsNotEmpty, IsOptional, IsString, IsEnum, Min, IsBoolean } from "class-validator";

export enum TipoEvento {
  CONCIERTO = 'CONCIERTO',
  CONFERENCIA = 'CONFERENCIA',
  EXPOSICION = 'EXPOSICION',
  TEATRO = 'TEATRO',
  CONGRESO = 'CONGRESO',
  FESTIVAL = 'FESTIVAL',
  MASTERCLASS = 'MASTERCLASS',
  SEMINARIO = 'SEMINARIO',
  TALLER = 'TALLER',
  INSTITUCIONAL = 'INSTITUCIONAL',
  OTRO = 'OTRO',
}

export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsEnum(TipoEvento, { message: 'tipo debe ser uno de los valores permitidos' })
  @IsNotEmpty()
  tipo: TipoEvento;

  @IsDateString({}, { message: 'La fechaInicio debe ser una cadena ISO 8601 válida' })
  @IsNotEmpty()
  fechaInicio: string;

  

  @IsInt()
  @Min(1)
  aforoMaximo: number;

  @IsOptional()
@Transform(({ value }) => (value === '' ? undefined : value))
@IsUUID()
escuelaId?: string;

  @IsString()
  @IsNotEmpty()
  lugar: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;

  // Activa el formulario de inscripción por red/rol/edad (en vez del
  // formulario genérico de inscripcion-evento) para este evento.
  @IsBoolean()
  @IsOptional()
  usaFormularioRed?: boolean = false;

  // Cupos por categoría del formulario de red. Cada uno es independiente:
  // null/omitido = esa categoría no está disponible en este evento (se
  // rechaza cualquier inscripción que caiga en ella). Así el mismo
  // formulario se reutiliza en eventos futuros con un subconjunto distinto
  // de categorías activas.
  @IsInt() @Min(0) @IsOptional()
  cupoNinosMusica?: number;

  @IsInt() @Min(0) @IsOptional()
  cupoJovenesMusica?: number;

  @IsInt() @Min(0) @IsOptional()
  cupoLaboratorioRed?: number;

  @IsInt() @Min(0) @IsOptional()
  cupoRpac?: number;

  @IsInt() @Min(0) @IsOptional()
  cupoEquipoInterno?: number;
}