import { PartialType } from '@nestjs/mapped-types';
import { CreateAccesoLogDto } from './create-acceso-log.dto';

export class UpdateAccesoLogDto extends PartialType(CreateAccesoLogDto) {}
