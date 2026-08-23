// dto/create-usuario.dto.ts
import {
  IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength,
  MinLength, IsEnum, IsDateString, IsArray, IsUUID,
} from 'class-validator';
import { TipoDocumento } from '../../common/entity/persona-base.entity';

export class CreateUsuarioDto {
  @IsEnum(TipoDocumento) @IsOptional()
  tipoDocumento?: TipoDocumento;

  @IsString() @IsNotEmpty() @MaxLength(20)
  documento: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  nombres: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  apellidos: string;

  @IsEmail() @IsNotEmpty() @MaxLength(150)
  email: string;

  @IsString() @IsNotEmpty() @MinLength(8)
  password: string;

  @IsString() @IsOptional() @MaxLength(20)
  telefono?: string;

  @IsDateString() @IsOptional()
  fechaNacimiento?: string;

  @IsString() @IsOptional() @MaxLength(255)
  direccion?: string;

  // Códigos de rol (ej: ['FORMADOR', 'APOYO']), se resuelven contra la tabla roles
  @IsArray() @IsString({ each: true }) @IsNotEmpty()
  rolesCodigos: string[];
}

