import { PartialType } from '@nestjs/mapped-types';
import { RegistrarAccesoDto } from './registrar-acceso.dto';

export class UpdateAccesoLogDto extends PartialType(RegistrarAccesoDto) {}
