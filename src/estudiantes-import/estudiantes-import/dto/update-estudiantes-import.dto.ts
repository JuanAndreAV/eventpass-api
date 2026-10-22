import { PartialType } from '@nestjs/mapped-types';
import { CreateEstudiantesImportDto } from './create-estudiantes-import.dto';

export class UpdateEstudiantesImportDto extends PartialType(CreateEstudiantesImportDto) {}
