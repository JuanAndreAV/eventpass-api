import { Module } from '@nestjs/common';
import { InscripcionPrivadaService } from './inscripcion-privada.service';
import { InscripcionPrivadaController } from './inscripcion-privada.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstudianteAgrupacion } from 'src/agrupacion-integrada/entities/estudiante-agrupacion.entity';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';
import {  EventoInscripcionPrivada } from './entities/inscripcion-privada.entity';
import { Asistente } from 'src/asistentes/entities/asistente.entity';
import { Evento } from 'src/eventos/entities/evento.entity';
import { Escuela } from 'src/escuelas/entities/escuela.entity';
import { EventoCupoEscuela } from './entities/evento-cupo-escuela.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventoInscripcionPrivada, EventoCupoEscuela, Asistente, Evento, Escuela,
      Estudiante, EstudianteAgrupacion,
    ])
  ],
  controllers: [InscripcionPrivadaController],
  providers: [InscripcionPrivadaService],
})
export class InscripcionPrivadaModule {}
