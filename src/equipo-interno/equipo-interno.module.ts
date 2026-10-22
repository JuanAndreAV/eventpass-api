// equipo-interno/equipo-interno.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cargo } from './entities/cargo.entity';
import { ContratoInteradministrativo } from './entities/contrato-interadministrativo.entity';
import { EquipoInterno } from './entities/equipo-interno.entity';
import { Justificacion } from './entities/justificacion.entity';
import { ObjetoContrato } from './entities/objeto-contrato.entity';
import { PerfilFuncion } from './entities/perfil-funcion.entity';
import { Vinculacion } from './entities/vinculacion.entity';
import { EquipoInternoController } from './equipo-interno.controller';
import { EquipoInternoService } from './equipo-interno.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    EquipoInterno, Vinculacion, Cargo, ContratoInteradministrativo,
    ObjetoContrato, Justificacion, PerfilFuncion,
  ])],
  controllers: [EquipoInternoController],
  providers: [EquipoInternoService],
  exports: [EquipoInternoService],
})
export class EquipoInternoModule {}
