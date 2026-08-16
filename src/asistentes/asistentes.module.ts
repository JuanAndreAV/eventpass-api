import { Module } from '@nestjs/common';
import { AsistentesService } from './asistentes.service';
import { AsistentesController } from './asistentes.controller';
import { Asistente } from './entities/asistente.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asistente])
  ],
  controllers: [AsistentesController],
  providers: [AsistentesService],
  exports: [TypeOrmModule]
})
export class AsistentesModule {}
