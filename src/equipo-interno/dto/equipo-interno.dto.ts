// equipo-interno/dto/equipo-interno.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength,
} from 'class-validator';
import { TipoDocumento } from '../../common/entity/persona-base.entity';
import { EstadoDatosPersona } from '../entities/equipo-interno.entity';

export class CreateEquipoInternoDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  nombreCompleto: string;

  @IsEnum(TipoDocumento) @IsOptional()
  tipoDocumento?: TipoDocumento;

  @IsString() @IsOptional() @MaxLength(20)
  documento?: string;

  @IsEmail() @IsOptional()
  email?: string;

  @IsString() @IsOptional() @MaxLength(20)
  telefono?: string;

  @IsEnum(EstadoDatosPersona) @IsOptional()
  estadoDatos?: EstadoDatosPersona;

  @IsBoolean() @IsOptional()
  activo?: boolean;
}

export class UpdateEquipoInternoDto extends PartialType(CreateEquipoInternoDto) {}
