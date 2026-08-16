import { Module } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { EstudiantesController } from './estudiantes.controller';
import { Estudiante } from './entities/estudiante.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estudiante])
  ],
  controllers: [EstudiantesController],
  providers: [EstudiantesService],
  exports: [TypeOrmModule]
})
export class EstudiantesModule {}
