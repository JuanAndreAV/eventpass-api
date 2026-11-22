import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AgrupacionIntegradaService } from './agrupacion-integrada.service';
import { CreateAgrupacionIntegradaDto } from './dto/create-agrupacion-integrada.dto';
import { UpdateAgrupacionIntegradaDto } from './dto/update-agrupacion-integrada.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/roles-enum/role.enum';

// Antes las rutas eran públicas (stubs del generador). Ahora solo el admin.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('agrupacion-integrada')
export class AgrupacionIntegradaController {
  constructor(private readonly agrupacionIntegradaService: AgrupacionIntegradaService) {}

  // Pendiente: CRUD de agrupaciones
  @Post()
  create(@Body() createAgrupacionIntegradaDto: CreateAgrupacionIntegradaDto) {
    return this.agrupacionIntegradaService.create(createAgrupacionIntegradaDto);
  }

  @Get()
  findAll() {
    return this.agrupacionIntegradaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.agrupacionIntegradaService.findOne(id);
  }

  // Pendiente: CRUD de agrupaciones
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateAgrupacionIntegradaDto: UpdateAgrupacionIntegradaDto) {
    return this.agrupacionIntegradaService.update(id, updateAgrupacionIntegradaDto);
  }

  // Pendiente: CRUD de agrupaciones
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.agrupacionIntegradaService.remove(id);
  }
}
