import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstudiantesImportService } from './estudiantes-import.service';

@Controller('estudiantes')
// @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')  ← protégelo con tus guards
export class EstudiantesImportController {
  constructor(private readonly importService: EstudiantesImportService) {}

  // POST /estudiantes/import?dry=true  (multipart, campo "file")
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importar(
    @UploadedFile() file: { originalname: string; buffer: Buffer },
    @Query('dry') dry?: string,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file")');
    if (!/\.xlsx$/i.test(file.originalname)) throw new BadRequestException('Debe ser un .xlsx');
    return this.importService.importar(file.buffer, dry !== 'false'); // dry-run por defecto
  }
}