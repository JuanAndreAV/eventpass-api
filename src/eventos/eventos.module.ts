import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { Evento } from './entities/evento.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Evento])
  ],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [TypeOrmModule]
})
export class EventosModule {}
