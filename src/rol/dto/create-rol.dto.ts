import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateRolDto {
  @IsString() @IsNotEmpty() @MaxLength(50)
  codigo: string; // ADMIN, DIRECTOR, APOYO, FORMADOR

  @IsString() @IsNotEmpty() @MaxLength(100)
  nombre: string;

  @IsString() @IsOptional()
  descripcion?: string;
}