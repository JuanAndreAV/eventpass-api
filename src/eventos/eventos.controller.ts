import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  // Crear/editar/borrar eventos quedan solo para admin y formador (igual que
  // la página "registro-evento" del panel); listar/ver quedan público porque
  // los usan "eventos" (lista pública) e "inscripcion-evento" sin cuenta.
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Formador)
  @Post()
  async create(@Body() createEventoDto: CreateEventoDto) {
    return await this.eventosService.create(createEventoDto);
  }

  @Get()
  async findAll() {
    return await this.eventosService.findAll();
  }
  // eventos/eventos.controller.ts — nuevo endpoint
  @Get('activos')
  async findActivos() {
    return await this.eventosService.findActivos();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.eventosService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Formador)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateEventoDto: UpdateEventoDto) {
    return await this.eventosService.update(id, updateEventoDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Formador)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.eventosService.remove(id);
  }
}