// inscripcion-red/inscripcion-red.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evento } from '../eventos/entities/evento.entity';
import { InscripcionRed } from './entities/inscripcion-red.entity';
import { InscripcionRedController } from './inscripcion-red.controller';
import { InscripcionRedService } from './inscripcion-red.service';

@Module({
  imports: [TypeOrmModule.forFeature([InscripcionRed, Evento])],
  controllers: [InscripcionRedController],
  providers: [InscripcionRedService],
})
export class InscripcionRedModule {}
