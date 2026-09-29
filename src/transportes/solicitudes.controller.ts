import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOpcionalGuard } from '../auth/guards/jwt-opcional.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { CreateSolicitudDto, RechazarSolicitudDto, UpdateSolicitudDto } from './dto/solicitud.dto';
import { EstadoSolicitud } from './entities/solicitud.entity';
import { SolicitudesService, type UsuarioAutenticado } from './solicitudes.service';

@Controller('transportes/solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  // El solicitante no tiene cuenta: se identifica con su documento de estudiante.
  @Post()
  create(@Body() dto: CreateSolicitudDto) {
    return this.solicitudesService.create(dto);
  }

  @Get('consulta')
  findByDocumento(@Query('documento') documento: string) {
    return this.solicitudesService.findByDocumento(documento);
  }

  // Prellenado del formulario: devuelve la última solicitud de ese documento.
  @Get('ultima')
  findUltimaByDocumento(@Query('documento') documento: string) {
    return this.solicitudesService.ultimaPorDocumento(documento);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria)
  @Get()
  findAll(
    @Req() req: Request,
    @Query('cicloId') cicloId?: string,
    @Query('escuelaId') escuelaId?: string,
    @Query('estado') estado?: EstadoSolicitud,
  ) {
    return this.solicitudesService.findAll(
      { cicloId, escuelaId, estado },
      req.user as UsuarioAutenticado,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudesService.findOne(id);
  }

  // Sin sesión edita el estudiante, y solo hasta la fecha de cierre. Con sesión de
  // administrador o secretaría se puede editar también después. El guard opcional
  // permite atender ambos casos por la misma ruta.
  @UseGuards(JwtOpcionalGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSolicitudDto,
    @Req() req: Request,
  ) {
    return this.solicitudesService.update(id, dto, req.user as UsuarioAutenticado | undefined);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria)
  @Patch(':id/aprobar')
  aprobar(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.solicitudesService.aprobar(id, req.user as UsuarioAutenticado);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria)
  @Patch(':id/rechazar')
  rechazar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RechazarSolicitudDto,
    @Req() req: Request,
  ) {
    return this.solicitudesService.rechazar(id, dto.motivoRechazo, req.user as UsuarioAutenticado);
  }
}
