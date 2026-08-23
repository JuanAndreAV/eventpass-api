// dto/marcar-ingreso.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class MarcarIngresoPorQrDto {
  @IsString() @IsNotEmpty()
  qrToken: string;
}