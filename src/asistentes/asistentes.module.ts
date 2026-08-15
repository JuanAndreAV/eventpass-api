import { Module } from '@nestjs/common';
import { AsistentesService } from './asistentes.service';
import { AsistentesController } from './asistentes.controller';

@Module({
  controllers: [AsistentesController],
  providers: [AsistentesService],
})
export class AsistentesModule {}
