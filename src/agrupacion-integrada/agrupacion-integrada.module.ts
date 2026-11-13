import { Module } from '@nestjs/common';
import { AgrupacionIntegradaService } from './agrupacion-integrada.service';
import { AgrupacionIntegradaController } from './agrupacion-integrada.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstudianteAgrupacion } from './entities/estudiante-agrupacion.entity';
import { AgrupacionIntegrada } from './entities/agrupacion-integrada.entity';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgrupacionIntegrada, EstudianteAgrupacion, Estudiante])
  ],
  controllers: [AgrupacionIntegradaController],
  providers: [AgrupacionIntegradaService],
})
export class AgrupacionIntegradaModule {}
