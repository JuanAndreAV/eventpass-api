import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { InformesService } from './informes.service';
import { CreateInformeDto } from './dto/create-informe.dto';
import { UpdateInformeDto } from './dto/update-informe.dto';
import { FiltrosInformesDto } from './dto/filtros-informe.dto';

@Controller('informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  
  @Get('periodos')
  getInforme() {
    return this.informesService.obtenerPeriodos();
  }
  @Get('resumen')
  getResumen(@Query() filtros: FiltrosInformesDto) {
    return this.informesService.obtenerResumen(filtros.mesId);
  }
 @Get('diagnostico-periodos')
diagnosticarPeriodos(
  @Query('anio', ParseIntPipe) anio: number,
) {
  return this.informesService.diagnosticarPeriodos(anio);
}
@Get('comparar-periodos')
compararPeriodos(@Query('anio', ParseIntPipe) anio: number) {
  return this.informesService.compararPeriodos(anio);
}

@Get('evolucion')
obtenerEvolucion(
  @Query('anio', ParseIntPipe) anio: number,
) {
  return this.informesService.obtenerEvolucion(anio);
}

@Get('escuelas')
obtenerResumenEscuelas(
  @Query('mesId', ParseIntPipe) mesId: number,
) {
  return this.informesService.obtenerResumenEscuelas(mesId);
}
@Get('escuelas/validacion')
validarResumenEscuelas(
  @Query('mesId', ParseIntPipe) mesId: number,
) {
  return this.informesService.validarResumenEscuelas(mesId);
}

@Get('profesores')
obtenerProfesores(
  @Query('mesId', ParseIntPipe) mesId: number,
) {
  return this.informesService.obtenerProfesores(mesId);
}

@Get('profesores/:profesorId/respuestas')
obtenerRespuestasProfesor(
  @Param('profesorId', ParseIntPipe) profesorId: number,
  @Query('mesId', ParseIntPipe) mesId: number,
) {
  return this.informesService.obtenerRespuestasProfesor(
    mesId,
    profesorId,
  );
}

}
