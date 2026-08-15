import { Module } from '@nestjs/common';
import { AccesosService } from './accesos.service';
import { AccesosController } from './accesos.controller';

@Module({
  controllers: [AccesosController],
  providers: [AccesosService],
})
export class AccesosModule {}
