// estudiantes/estudiantes.module.ts
import { Module } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { EstudiantesController } from './estudiantes.controller';
import { Estudiante } from './entities/estudiante.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escuela } from 'src/escuelas/entities/escuela.entity';
// 👈 se quita el import de RolService, no se usa aquí

@Module({
  imports: [
    TypeOrmModule.forFeature([Estudiante, Escuela]),
  ],
  controllers: [EstudiantesController],
  providers: [EstudiantesService],
  exports: [TypeOrmModule, EstudiantesService],
})
export class EstudiantesModule {}