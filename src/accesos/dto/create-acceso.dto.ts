import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum MedioAcceso {
  QR = 'QR',
  CEDULA = 'CEDULA',
  NFC = 'NFC'
}

export class CreateAccesoDto {
    @IsString()
  @IsNotEmpty()
  tokenODocumento: string; // Puede ser el número de cédula o el token del QR

  @IsEnum(MedioAcceso)
  medio: MedioAcceso;

  @IsDateString()
  @IsNotEmpty()
  fechaIngreso: string; // Viene generado desde la PWA (ISO 8601)

  @IsString()
  @IsOptional()
  dispositivoId?: string;
}
