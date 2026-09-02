// dto/marcar-ingreso.dto.ts
import { IsString, IsNotEmpty, ValidateIf, IsUUID, IsOptional } from 'class-validator';

export class MarcarIngresoDto {
  @IsString()
  @IsOptional()
  qrToken?: string;

  @IsString()
  @ValidateIf((dto) => !dto.qrToken) // solo se exige si NO viene qrToken
  documento?: string;

  @IsUUID()
  @ValidateIf((dto) => !dto.qrToken)
  eventoId?: string;
}