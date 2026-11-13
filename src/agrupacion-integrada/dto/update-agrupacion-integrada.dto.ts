import { PartialType } from '@nestjs/mapped-types';
import { CreateAgrupacionIntegradaDto } from './create-agrupacion-integrada.dto';

export class UpdateAgrupacionIntegradaDto extends PartialType(CreateAgrupacionIntegradaDto) {}
