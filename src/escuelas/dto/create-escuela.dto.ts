import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUUID,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateEscuelaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  telefonoSecundario?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  @IsOptional()
  directorId?: string;

  @IsUUID()
  @IsOptional()
  apoyoAdministrativoId?: string; // 👈 ID del usuario asignado como Apoyo Administrativo

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  formadoresIds?: string[];

  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}