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

  // Dato sensible: solo Admin puede enviarlo (ver guard en el controller) y
  // nunca se devuelve en una respuesta (select:false en la entidad).
  @IsString() @IsOptional() @MaxLength(50)
  cuentaBancaria?: string;

  @IsString() @IsOptional() @MaxLength(100)
  eps?: string;

  @IsString() @IsOptional() @MaxLength(100)
  arl?: string;

  @IsString() @IsOptional() @MaxLength(100)
  afp?: string;

  @IsString() @IsOptional() @MaxLength(100)
  cesantias?: string;

  @IsEnum(EstadoDatosPersona) @IsOptional()
  estadoDatos?: EstadoDatosPersona;

  @IsBoolean() @IsOptional()
  activo?: boolean;
}

export class UpdateEquipoInternoDto extends PartialType(CreateEquipoInternoDto) {}
