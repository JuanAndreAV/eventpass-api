// equipo-interno/equipo-interno.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipoInterno } from './entities/equipo-interno.entity';
import { EquipoInternoController } from './equipo-interno.controller';
import { EquipoInternoService } from './equipo-interno.service';

@Module({
  imports: [TypeOrmModule.forFeature([EquipoInterno])],
  controllers: [EquipoInternoController],
  providers: [EquipoInternoService],
  exports: [EquipoInternoService],
})
export class EquipoInternoModule {}
