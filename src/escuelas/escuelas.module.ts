import { Module } from '@nestjs/common';
import { EscuelasService } from './escuelas.service';
import { EscuelasController } from './escuelas.controller';

@Module({
  controllers: [EscuelasController],
  providers: [EscuelasService],
})
export class EscuelasModule {}
