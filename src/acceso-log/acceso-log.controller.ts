// acceso-log.controller.ts
import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOpcionalGuard } from '../auth/guards/jwt-opcional.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { AccesoLogService } from './acceso-log.service';
import { RegistrarAccesoDto } from './dto/registrar-acceso.dto';
import { MetodoLectura } from './entities/acceso-log.entity';

@Controller('accesos-log')
export class AccesoLogController {
  constructor(private readonly accesoLogService: AccesoLogService) {}

  // Endpoint principal usado por la app/PWA del vigilante. QR, NFC y el
  // PDF417 de la cédula son posesión física; MANUAL es solo un número
  // tecleado y sí exige sesión (mismo patrón que estudiantes/identificar).
  @UseGuards(JwtOpcionalGuard)
  @Post()
  registrarAcceso(@Body() dto: RegistrarAccesoDto, @Req() req: Request) {
    if (dto.metodoLectura === MetodoLectura.MANUAL && !req.user) {
      throw new UnauthorizedException(
        'El registro manual de acceso requiere sesión del vigilante; usa QR, NFC o la cédula',
      );
    }
    return this.accesoLogService.registrarAcceso(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Formador)
  @Get('evento/:eventoId')
  findByEvento(@Param('eventoId') eventoId: string) {
    return this.accesoLogService.findByEvento(eventoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Formador)
  @Get('estudiante/:estudianteId')
  findByEstudiante(@Param('estudianteId') estudianteId: string) {
    return this.accesoLogService.findByEstudiante(estudianteId);
  }
}