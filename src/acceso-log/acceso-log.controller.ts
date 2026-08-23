// acceso-log.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccesoLogService } from './acceso-log.service';
import { RegistrarAccesoDto } from './dto/registrar-acceso.dto';

@Controller('accesos-log')
export class AccesoLogController {
  constructor(private readonly accesoLogService: AccesoLogService) {}

  // Endpoint principal usado por la app/PWA del vigilante
  @Post()
  registrarAcceso(@Body() dto: RegistrarAccesoDto) {
    return this.accesoLogService.registrarAcceso(dto);
  }

  @Get('evento/:eventoId')
  findByEvento(@Param('eventoId') eventoId: string) {
    return this.accesoLogService.findByEvento(eventoId);
  }

  @Get('estudiante/:estudianteId')
  findByEstudiante(@Param('estudianteId') estudianteId: string) {
    return this.accesoLogService.findByEstudiante(estudianteId);
  }
}