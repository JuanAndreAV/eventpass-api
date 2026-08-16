import { Module } from '@nestjs/common';
import { AccesoLogService } from './acceso-log.service';
import { AccesoLogController } from './acceso-log.controller';
import { AccesoLog } from './entities/acceso-log.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccesoLog]),
  ],
  controllers: [AccesoLogController],
  providers: [AccesoLogService],
  exports: [TypeOrmModule], // Exporta TypeOrmModule para que otros módulos puedan usarlo
})
export class AccesoLogModule {}
