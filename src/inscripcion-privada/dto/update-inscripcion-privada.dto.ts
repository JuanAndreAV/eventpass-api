import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import {
  InscribirEscuelaDto,
  InscribirAgrupacionDto,
  CrearConfiguracionDto,
  ActualizarCupoDto, // si lo tenías separado
} from './create-inscripcion-privada.dto'; // ⚠️ Ajusta la ruta según dónde tengas guardado el otro archivo

export class ActualizarEscuelaDto extends PartialType(InscribirEscuelaDto) {}

export class ActualizarAgrupacionDto extends PartialType(InscribirAgrupacionDto) {}

export class ActualizarConfiguracionDto extends PartialType(CrearConfiguracionDto) {
  @IsOptional() 
  @IsBoolean()
  activa?: boolean;
}

export class ActualizarCupoParcialDto extends PartialType(ActualizarCupoDto) {}