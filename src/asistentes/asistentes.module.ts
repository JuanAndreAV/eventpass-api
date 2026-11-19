import { Module } from '@nestjs/common';
import { AsistentesService } from './asistentes.service';
import { AsistentesController } from './asistentes.controller';
import { Asistente } from './entities/asistente.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evento } from 'src/eventos/entities/evento.entity';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';
import { Escuela } from 'src/escuelas/entities/escuela.entity';
import { EquipoInterno } from 'src/equipo-interno/entities/equipo-interno.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asistente, Evento, Estudiante, Escuela, EquipoInterno])
  ],
  controllers: [AsistentesController],
  providers: [AsistentesService],
  exports: [TypeOrmModule, AsistentesService]
})
export class AsistentesModule {}
