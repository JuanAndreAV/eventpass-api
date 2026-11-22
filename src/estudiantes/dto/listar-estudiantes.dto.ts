import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

// Filtros del módulo de gestión de estudiantes (panel administrativo)
export class ListarEstudiantesDto {
  // Busca en nombres, apellidos y documento
  @IsString() @IsOptional() @MaxLength(100)
  q?: string;

  @IsUUID() @IsOptional()
  escuelaId?: string;

  // Id de una agrupación integrada concreta
  @IsUUID() @IsOptional()
  agrupacionId?: string;

  // 'con' = pertenece a alguna agrupación activa, 'sin' = a ninguna.
  // Se ignora si viene agrupacionId.
  @IsIn(['con', 'sin']) @IsOptional()
  enAgrupacion?: 'con' | 'sin';

  @Type(() => Number) @IsInt() @Min(1) @IsOptional()
  page?: number = 1;

  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional()
  limit?: number = 25;
}
