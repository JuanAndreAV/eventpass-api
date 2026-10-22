// inscripcion-red/inscripcion-red.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { ConfirmarInscripcionRedDto } from './dto/confirmar-inscripcion-red.dto';
import { CreateInscripcionRedDto } from './dto/create-inscripcion-red.dto';
import { InscripcionRedService } from './inscripcion-red.service';

@Controller('inscripcion-red')
export class InscripcionRedController {
  constructor(private readonly inscripcionRedService: InscripcionRedService) {}

  // Pública, sin cuenta: el formulario de inscripción por red.
  @Post()
  crear(@Body() dto: CreateInscripcionRedDto) {
    return this.inscripcionRedService.crear(dto);
  }

  // Pública: para quien el paso 1 (identificar) ya reconoció como estudiante
  // o equipo interno — un solo clic, sin volver a pedirle nada.
  @Post('confirmar')
  confirmar(@Body() dto: ConfirmarInscripcionRedDto) {
    return this.inscripcionRedService.confirmar(dto);
  }

  // Pública: el formulario la usa para saber qué categorías mostrar como
  // llenas antes de que la persona llene todo el resto de los datos.
  @Get('evento/:eventoId/resumen')
  resumenCupos(@Param('eventoId', ParseUUIDPipe) eventoId: string) {
    return this.inscripcionRedService.resumenCupos(eventoId);
  }

  // Pública: primer paso del formulario — con solo el documento, dice si ya
  // es estudiante o equipo interno (o si ya se inscribió a este evento).
  @Get('evento/:eventoId/identificar/:documento')
  identificar(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Param('documento') documento: string,
  ) {
    return this.inscripcionRedService.identificar(eventoId, documento);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Formador)
  @Get('evento/:eventoId')
  findByEvento(@Param('eventoId', ParseUUIDPipe) eventoId: string) {
    return this.inscripcionRedService.findByEvento(eventoId);
  }
}
