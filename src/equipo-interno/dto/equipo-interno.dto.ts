// equipo-interno/dto/equipo-interno.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
  ValidateIf, ValidateNested,
} from 'class-validator';
import { TipoDocumento } from '../../common/entity/persona-base.entity';
import { TipoContrato } from '../entities/equipo-interno.entity';

// '' desde los formularios se guarda como null, no como texto vacío
const vacioANull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : typeof value === 'string' ? value.trim() : value;

export class AsignacionDto {
  // Presente = actualizar esa asignación; ausente = crear una nueva
  @IsUUID() @IsOptional()
  id?: string;

  @IsUUID()
  cargoId: string;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsUUID() @IsOptional()
  escuelaId?: string | null;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsUUID() @IsOptional()
  agrupacionId?: string | null;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(150) @IsOptional()
  detalle?: string | null;

  @IsBoolean() @IsOptional()
  principal?: boolean;
}

export class CreateEquipoInternoDto {
  @Transform(vacioANull) @IsString() @IsNotEmpty() @MaxLength(200)
  nombreCompleto: string;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsEnum(TipoDocumento) @IsOptional()
  tipoDocumento?: TipoDocumento | null;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(20) @IsOptional()
  documento?: string | null;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsEmail() @IsOptional()
  email?: string | null;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(20) @IsOptional()
  telefono?: string | null;

  @Transform(vacioANull) @ValidateIf((_, v) => v !== null) @IsEnum(TipoContrato) @IsOptional()
  tipoContrato?: TipoContrato | null;

  @IsBoolean() @IsOptional()
  activo?: boolean;

  // Si se envía, reemplaza el conjunto completo de asignaciones de la persona
  // (las que no vengan en la lista se eliminan).
  @IsArray() @ValidateNested({ each: true }) @Type(() => AsignacionDto) @IsOptional()
  asignaciones?: AsignacionDto[];
}

export class UpdateEquipoInternoDto extends PartialType(CreateEquipoInternoDto) {}
