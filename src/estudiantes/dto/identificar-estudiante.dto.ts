import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

export enum MetodoIdentificacion {
  NFC = 'NFC',
  QR = 'QR',
  DOCUMENTO = 'DOCUMENTO',
}

export class IdentificarEstudianteDto {
  @IsEnum(MetodoIdentificacion)
  metodo: MetodoIdentificacion;

  @IsString() @IsNotEmpty()
  valor: string; // el UID leído, el token del QR, o el número de documento
}