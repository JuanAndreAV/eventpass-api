// estudiantes.controller.ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto';
import { IdentificarEstudianteDto } from './dto/identificar-estudiante.dto';
import { CarnetEstudianteDto } from './dto/carnet-estudiante.dto';

@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @Post() // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'DIRECTOR', 'APOYO')
  create(@Body() dto: CreateEstudianteDto) {
    return this.estudiantesService.create(dto);
  }

  @Get()
  findAll(@Query('escuelaId') escuelaId?: string) {
    return this.estudiantesService.findAll(escuelaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estudiantesService.findOne(id);
  }

  // Endpoint clave para la app del vigilante
  @Post('identificar')
async identificar(@Body() dto: IdentificarEstudianteDto) {
  const estudiante = await this.estudiantesService.identificar(dto);
  return CarnetEstudianteDto.fromEntity(estudiante);
}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEstudianteDto) {
    return this.estudiantesService.update(id, dto);
  }

  @Patch(':id/escuela/:escuelaId')
  cambiarEscuela(@Param('id') id: string, @Param('escuelaId') escuelaId: string) {
    return this.estudiantesService.cambiarEscuela(id, escuelaId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.estudiantesService.remove(id);
  }
}