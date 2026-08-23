import { PartialType } from '@nestjs/mapped-types';
import { InscribirAsistenteDto } from './create-asistente.dto';

export class UpdateAsistenteDto extends PartialType(InscribirAsistenteDto) {}
