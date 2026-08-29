import { Module } from '@nestjs/common';
import { ValidacionIdentidadService } from './validacion-identidad.service';
import { ValidacionIdentidadController } from './validacion-identidad.controller';

@Module({
  controllers: [ValidacionIdentidadController],
  providers: [ValidacionIdentidadService],
})
export class ValidacionIdentidadModule {}
