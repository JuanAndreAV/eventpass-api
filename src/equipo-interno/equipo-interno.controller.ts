// equipo-interno/equipo-interno.controller.ts
import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { CreateEquipoInternoDto, UpdateEquipoInternoDto } from './dto/equipo-interno.dto';
import { CreateVinculacionDto, UpdateVinculacionDto } from './dto/vinculacion.dto';
import { EquipoInternoService } from './equipo-interno.service';

// Todo bajo Admin: esta tabla tiene datos sensibles (cuenta bancaria, EPS,
// salarios) de personal real, no es información que ningún otro rol necesite
// ver directamente — ni siquiera Secretaria, que ya tiene acceso amplio en
// otros módulos de este sistema.
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
@Controller('equipo-interno')
export class EquipoInternoController {
  constructor(private readonly equipoInternoService: EquipoInternoService) {}

  @Get()
  findAll() {
    return this.equipoInternoService.findAll();
  }

  @Get('catalogos/cargos')
  findAllCargos() {
    return this.equipoInternoService.findAllCargos();
  }

  @Get('catalogos/contratos')
  findAllContratos() {
    return this.equipoInternoService.findAllContratos();
  }

  @Get('catalogos/objetos-contrato')
  findAllObjetosContrato() {
    return this.equipoInternoService.findAllObjetosContrato();
  }

  @Get('catalogos/justificaciones')
  findAllJustificaciones() {
    return this.equipoInternoService.findAllJustificaciones();
  }

  @Get('catalogos/perfiles-funcion')
  findAllPerfilesFuncion() {
    return this.equipoInternoService.findAllPerfilesFuncion();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.equipoInternoService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateEquipoInternoDto) {
    return this.equipoInternoService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEquipoInternoDto) {
    return this.equipoInternoService.update(id, dto);
  }

  @Post('vinculaciones')
  crearVinculacion(@Body() dto: CreateVinculacionDto) {
    return this.equipoInternoService.crearVinculacion(dto);
  }

  @Patch('vinculaciones/:id')
  actualizarVinculacion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVinculacionDto) {
    return this.equipoInternoService.actualizarVinculacion(id, dto);
  }
}
