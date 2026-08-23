// dto/update-usuario.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';

// La contraseña se cambia por un endpoint aparte, no en el update general
export class UpdateUsuarioDto extends PartialType(
  OmitType(CreateUsuarioDto, ['password'] as const),
) {}

// dto/change-password.dto.ts
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString() @MinLength(8)
  passwordActual: string;

  @IsString() @MinLength(8)
  passwordNueva: string;
}
