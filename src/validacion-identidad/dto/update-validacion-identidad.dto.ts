import { PartialType } from '@nestjs/mapped-types';
import { CreateValidacionIdentidadDto } from './create-validacion-identidad.dto';

export class UpdateValidacionIdentidadDto extends PartialType(CreateValidacionIdentidadDto) {}
