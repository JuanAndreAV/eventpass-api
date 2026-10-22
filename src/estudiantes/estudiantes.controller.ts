// estudiantes.controller.ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOpcionalGuard } from '../auth/guards/jwt-opcional.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { EstudiantesService } from './estudiantes.service';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto';
import { IdentificarEstudianteDto, MetodoIdentificacion } from './dto/identificar-estudiante.dto';
import { CarnetEstudianteDto } from './dto/carnet-estudiante.dto';

@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Formador)
  @Post()
  create(@Body() dto: CreateEstudianteDto) {
    return this.estudiantesService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('escuelaId') escuelaId?: string) {
    return this.estudiantesService.findAll(escuelaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.estudiantesService.findOne(id);
  }

  // Endpoint clave para la app del vigilante. NFC/QR no necesitan sesión: leer
  // la credencial física ya es la prueba de identidad. DOCUMENTO sí la exige,
  // porque un número de documento se puede adivinar o conocer sin tener la
  // tarjeta en la mano (es el mismo patrón de IDOR ya corregido en transportes).
  @UseGuards(JwtOpcionalGuard)
  @Post('identificar')
  async identificar(@Body() dto: IdentificarEstudianteDto, @Req() req: Request) {
    if (dto.metodo === MetodoIdentificacion.DOCUMENTO && !req.user) {
      throw new UnauthorizedException(
        'Identificar por documento requiere una sesión del vigilante; usa NFC o QR sin sesión',
      );
    }
    const estudiante = await this.estudiantesService.identificar(dto);
    return CarnetEstudianteDto.fromEntity(estudiante);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Formador)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEstudianteDto) {
    return this.estudiantesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria)
  @Patch(':id/escuela/:escuelaId')
  cambiarEscuela(@Param('id') id: string, @Param('escuelaId') escuelaId: string) {
    return this.estudiantesService.cambiarEscuela(id, escuelaId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.estudiantesService.remove(id);
  }
}