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

  @IsUUID()
  @IsOptional()
  escuelaId?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean = true;
}