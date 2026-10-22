// asistentes.controller.ts
import {
  Body, Controller, Delete, Get, Param, Post,
  Query, Req, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOpcionalGuard } from '../auth/guards/jwt-opcional.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { AsistentesService } from './asistentes.service';
import { InscribirAsistenteDto } from './dto/create-asistente.dto';
import { MarcarIngresoDto } from './dto/marcar-ingreso.dto';

@Controller('asistentes')
export class AsistentesController {
  constructor(private readonly asistentesService: AsistentesService) {}

  // Autoinscripción pública al evento: sin esto no funciona "inscripcion-evento".
  @Post()
  inscribir(@Body() dto: InscribirAsistenteDto) {
    return this.asistentesService.inscribir(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Formador)
  @Get('evento/:eventoId')
  findByEvento(@Param('eventoId') eventoId: string) {
    return this.asistentesService.findByEvento(eventoId);
  }

  // Pública (la usa "inscripcion-evento" sin cuenta): el service ya no
  // devuelve nombre/correo/teléfono para que no filtre datos de otra persona.
  @Get('verificar-documento/:documento')
  verificarDocumento(
    @Param('documento') documento: string,
    @Query('eventoId') eventoId?: string,
  ) {
    return this.asistentesService.verificarDocumento(documento, eventoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Formador)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.asistentesService.findOne(id);
  }

  // Endpoint clave para el vigilante en la entrada del evento. El escaneo de
  // QR no necesita sesión (la posesión del QR ya es la prueba); marcar
  // ingreso por documento sí, porque un documento se puede adivinar y no
  // prueba que quien lo escribe esté realmente en la puerta.
  @UseGuards(JwtOpcionalGuard)
  @Post('ingreso')
  marcarIngreso(@Body() dto: MarcarIngresoDto, @Req() req: Request) {
    if (!dto.qrToken && !req.user) {
      throw new UnauthorizedException(
        'Marcar ingreso por documento requiere sesión del vigilante; usa el QR sin sesión',
      );
    }
    return this.asistentesService.marcarIngreso(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.asistentesService.remove(id);
  }
}