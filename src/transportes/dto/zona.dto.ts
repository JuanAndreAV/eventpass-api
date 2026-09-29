import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateZonaDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  nombre: string;

  @IsString() @IsOptional()
  descripcion?: string;

  @IsBoolean() @IsOptional()
  activa?: boolean;
}

export class UpdateZonaDto extends PartialType(CreateZonaDto) {}
