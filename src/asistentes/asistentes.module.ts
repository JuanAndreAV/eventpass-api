import { Module } from '@nestjs/common';
import { AsistentesService } from './asistentes.service';
import { AsistentesController } from './asistentes.controller';
import { Asistente } from './entities/asistente.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evento } from 'src/eventos/entities/evento.entity';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asistente, Evento, Estudiante])
  ],
  controllers: [AsistentesController],
  providers: [AsistentesService],
  exports: [TypeOrmModule, AsistentesService]
})
export class AsistentesModule {}
