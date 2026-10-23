// dto/marcar-ingreso.dto.ts
import { IsString, ValidateIf, IsUUID, IsOptional, IsISO8601 } from 'class-validator';

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

  // Solo la manda el escáner offline al sincronizar: es el momento real del
  // escaneo en el dispositivo, no el de la sincronización (que puede ser
  // minutos u horas después, ya con conexión).
  @IsISO8601()
  @IsOptional()
  fechaIngreso?: string;
}