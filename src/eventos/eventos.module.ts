import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { Evento } from './entities/evento.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escuela } from 'src/escuelas/entities/escuela.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evento]),
    TypeOrmModule.forFeature([Escuela]),
  ],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [TypeOrmModule]
})
export class EventosModule {}
