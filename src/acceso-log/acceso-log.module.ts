import { Module } from '@nestjs/common';
import { AccesoLogService } from './acceso-log.service';
import { AccesoLogController } from './acceso-log.controller';
import { AccesoLog } from './entities/acceso-log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asistente } from 'src/asistentes/entities/asistente.entity';
import { EstudiantesModule } from 'src/estudiantes/estudiantes.module';
import { EventosModule } from 'src/eventos/eventos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccesoLog, Asistente]),
    EstudiantesModule,
    EventosModule
  ],
  controllers: [AccesoLogController],
  providers: [AccesoLogService],
  exports: [TypeOrmModule], // Exporta TypeOrmModule para que otros módulos puedan usarlo
})
export class AccesoLogModule {}
