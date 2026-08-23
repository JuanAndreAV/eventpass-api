import {
  IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID,
  MaxLength, IsBoolean, IsArray,
} from 'class-validator';

export class CreateEscuelaDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  nombre: string;

  @IsString() @IsOptional() @MaxLength(50)
  codigo?: string; // si no se envía, el service la autogenera

  @IsString() @IsOptional() @MaxLength(200)
  direccion?: string;

  @IsEmail() @IsOptional() @MaxLength(100)
  email?: string;

  @IsString() @IsOptional() @MaxLength(50)
  telefono?: string;

  @IsString() @IsOptional() @MaxLength(50)
  telefonoSecundario?: string;

  @IsString() @IsOptional()
  descripcion?: string;

  @IsBoolean() @IsOptional()
  activa?: boolean = true;

  @IsUUID() @IsOptional()
  directorId?: string;

  @IsUUID() @IsOptional()
  apoyoAdministrativoId?: string;

  @IsArray() @IsUUID('all', { each: true }) @IsOptional()
  formadoresIds?: string[];
}