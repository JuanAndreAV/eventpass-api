import { Module } from '@nestjs/common';
import { EscuelasService } from './escuelas.service';
import { EscuelasController } from './escuelas.controller';
import { Escuela } from './entities/escuela.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Escuela])
  ],
  controllers: [EscuelasController],
  providers: [EscuelasService],
  exports: [TypeOrmModule]
})
export class EscuelasModule {}
