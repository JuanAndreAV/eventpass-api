// asistentes.controller.ts
import {
  Body, Controller, Delete, Get, Param, Post,
} from '@nestjs/common';
import { AsistentesService } from './asistentes.service';
import { InscribirAsistenteDto } from './dto/create-asistente.dto';
import { MarcarIngresoPorQrDto } from './dto/marcar-ingreso.dto';

@Controller('asistentes')
export class AsistentesController {
  constructor(private readonly asistentesService: AsistentesService) {}

  @Post()
  inscribir(@Body() dto: InscribirAsistenteDto) {
    return this.asistentesService.inscribir(dto);
  }

  @Get('evento/:eventoId')
  findByEvento(@Param('eventoId') eventoId: string) {
    return this.asistentesService.findByEvento(eventoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.asistentesService.findOne(id);
  }

  // Endpoint clave para el vigilante en la entrada del evento
  @Post('ingreso')
  marcarIngreso(@Body() dto: MarcarIngresoPorQrDto) {
    return this.asistentesService.marcarIngreso(dto.qrToken);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.asistentesService.remove(id);
  }
}