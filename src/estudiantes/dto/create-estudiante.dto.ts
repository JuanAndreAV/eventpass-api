import {
  IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID,
  MaxLength, IsUrl, IsEnum, IsDateString,
} from 'class-validator';
import { TipoDocumento } from '../../common/entity/persona-base.entity';

export class CreateEstudianteDto {
  @IsEnum(TipoDocumento)
  @IsOptional()
  tipoDocumento?: TipoDocumento;

  @IsString() @IsNotEmpty() @MaxLength(20)
  documento: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  nombres: string;

  @IsString() @IsNotEmpty() @MaxLength(100)
  apellidos: string;

  @IsEmail() @IsOptional() @MaxLength(150)
  email?: string;

  @IsString() @IsOptional() @MaxLength(20)
  telefono?: string;

  @IsDateString() @IsOptional()
  fechaNacimiento?: string;

  @IsString() @IsOptional() @MaxLength(255)
  direccion?: string;

  @IsString() @IsOptional() @MaxLength(100)
  instrumento?: string;

  @IsUrl() @IsOptional()
  fotoUrl?: string;

  @IsString() @IsOptional() @MaxLength(100)
  nfcUid?: string;

  @IsString() @IsOptional() @MaxLength(255)
  qrTokenMaster?: string;

  @IsUUID() @IsOptional()
  usuarioId?: string;

  @IsUUID() @IsNotEmpty()
  escuelaId: string;
}