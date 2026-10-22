// inscripcion-red/inscripcion-red.module.ts
import { Module } from '@nestjs/common';
import { AsistentesModule } from '../asistentes/asistentes.module';
import { EquipoInternoModule } from '../equipo-interno/equipo-interno.module';
import { EstudiantesModule } from '../estudiantes/estudiantes.module';
import { InscripcionRedController } from './inscripcion-red.controller';
import { InscripcionRedService } from './inscripcion-red.service';

@Module({
  imports: [
    // Las inscripciones por red se guardan en "asistentes" (tipo=RED), no en
    // una tabla propia: así también obtienen QR y pasan por el escáner del
    // día del evento. AsistentesModule exporta TypeOrmModule con los
    // repositorios de Asistente y Evento.
    AsistentesModule,
    EstudiantesModule, // aporta el repositorio de Estudiante (lo exporta vía TypeOrmModule)
    EquipoInternoModule,
  ],
  controllers: [InscripcionRedController],
  providers: [InscripcionRedService],
})
export class InscripcionRedModule {}
