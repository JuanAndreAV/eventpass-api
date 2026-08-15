import { PartialType } from '@nestjs/mapped-types';
import { CreateAsistenteDto } from './create-asistente.dto';

export class UpdateAsistenteDto extends PartialType(CreateAsistenteDto) {}
