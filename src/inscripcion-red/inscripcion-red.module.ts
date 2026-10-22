// inscripcion-red/inscripcion-red.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipoInternoModule } from '../equipo-interno/equipo-interno.module';
import { EstudiantesModule } from '../estudiantes/estudiantes.module';
import { Evento } from '../eventos/entities/evento.entity';
import { InscripcionRed } from './entities/inscripcion-red.entity';
import { InscripcionRedController } from './inscripcion-red.controller';
import { InscripcionRedService } from './inscripcion-red.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InscripcionRed, Evento]),
    EstudiantesModule, // aporta el repositorio de Estudiante (lo exporta vía TypeOrmModule)
    EquipoInternoModule,
  ],
  controllers: [InscripcionRedController],
  providers: [InscripcionRedService],
})
export class InscripcionRedModule {}
