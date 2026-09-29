import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAgrupacionDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  nombre: string;

  @IsString() @IsNotEmpty() @MaxLength(50)
  codigo: string;

  @IsString() @IsOptional() @MaxLength(200)
  destinoEspecial?: string;

  @IsBoolean() @IsOptional()
  requiereMarcaDistintiva?: boolean;

  // Habilita la casilla de acompañante en el formulario de solicitud.
  @IsBoolean() @IsOptional()
  permiteAcompanante?: boolean;

  // Ruta propia de la agrupación: si viene, manda sobre la ruta de la escuela.
  @IsUUID() @IsOptional()
  rutaId?: string | null;

  @IsBoolean() @IsOptional()
  activa?: boolean;
}

export class UpdateAgrupacionDto extends PartialType(CreateAgrupacionDto) {}
