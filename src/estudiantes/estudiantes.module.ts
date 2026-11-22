// estudiantes/estudiantes.module.ts
import { Module } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { EstudiantesController } from './estudiantes.controller';
import { Estudiante } from './entities/estudiante.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escuela } from 'src/escuelas/entities/escuela.entity';
import { EstudianteAgrupacion } from 'src/agrupacion-integrada/entities/estudiante-agrupacion.entity';
import { EquipoAsignacion } from 'src/equipo-interno/entities/equipo_asignacion.entity';
import { Asistente } from 'src/asistentes/entities/asistente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estudiante, Escuela, EstudianteAgrupacion, EquipoAsignacion, Asistente]),
  ],
  controllers: [EstudiantesController],
  providers: [EstudiantesService],
  exports: [TypeOrmModule, EstudiantesService],
})
export class EstudiantesModule {}