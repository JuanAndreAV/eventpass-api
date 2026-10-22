import { Module } from '@nestjs/common';
import { EstudiantesImportService } from './estudiantes-import.service';
import { EstudiantesImportController } from './estudiantes-import.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escuela } from 'src/escuelas/entities/escuela.entity';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estudiante, Escuela]),
  ],
  controllers: [EstudiantesImportController],
  providers: [EstudiantesImportService],
})
export class EstudiantesImportModule {}
