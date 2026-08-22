import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsUUID,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class CreateEstudianteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  documento: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefono?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  instrumento?: string; // e.g., 'Violín', 'Viola', 'Piano'

  @IsUrl()
  @IsOptional()
  fotoUrl?: string;

  // 💳 Tarjeta NFC / Carnet
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nfcUid?: string;

  // 📱 Token QR estático o maestro
  @IsString()
  @IsOptional()
  @MaxLength(255)
  qrTokenMaster?: string;

  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @IsUUID()
  @IsNotEmpty()
  escuelaId: string;
}