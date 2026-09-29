import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { CalculoService } from './calculo.service';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { CiclosController } from './ciclos.controller';
import { CiclosService } from './ciclos.service';
import { DocumentosService } from './documentos.service';
import { Agrupacion } from './entities/agrupacion.entity';
import { Ciclo } from './entities/ciclo.entity';
import { EscuelaRuta } from './entities/escuela-ruta.entity';
import { Instrumento } from './entities/instrumento.entity';
import { Ruta } from './entities/ruta.entity';
import { Solicitud } from './entities/solicitud.entity';
import { Tarifa } from './entities/tarifa.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { Zona } from './entities/zona.entity';
import { RutasController } from './rutas.controller';
import { RutasService } from './rutas.service';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Zona, TipoVehiculo, Tarifa, Instrumento, Agrupacion,
      Ruta, EscuelaRuta, Ciclo, Solicitud,
      Escuela, Estudiante,
    ]),
  ],
  controllers: [CatalogosController, RutasController, CiclosController, SolicitudesController],
  providers: [
    CatalogosService, RutasService, CiclosService, SolicitudesService,
    CalculoService, DocumentosService,
  ],
  exports: [TypeOrmModule, RutasService],
})
export class TransportesModule {}
