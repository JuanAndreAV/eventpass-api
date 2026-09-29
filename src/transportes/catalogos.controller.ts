import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { CatalogosService } from './catalogos.service';
import { CreateZonaDto, UpdateZonaDto } from './dto/zona.dto';
import { CreateTipoVehiculoDto, UpdateTipoVehiculoDto } from './dto/tipo-vehiculo.dto';
import { CreateTarifaDto, UpdateTarifaDto } from './dto/tarifa.dto';
import { CreateInstrumentoDto, UpdateInstrumentoDto } from './dto/instrumento.dto';
import { CreateAgrupacionDto, UpdateAgrupacionDto } from './dto/agrupacion.dto';

// Las lecturas quedan abiertas porque el formulario público de solicitud las necesita
// (el solicitante no tiene cuenta). Toda escritura es exclusiva del administrador.
@Controller('transportes/catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('escuelas')
  findEscuelas() {
    return this.catalogosService.findEscuelasParaFormulario();
  }

  @Get('zonas')
  findAllZonas() {
    return this.catalogosService.findAllZonas();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('zonas')
  createZona(@Body() dto: CreateZonaDto) {
    return this.catalogosService.createZona(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('zonas/:id')
  updateZona(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateZonaDto) {
    return this.catalogosService.updateZona(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete('zonas/:id')
  removeZona(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogosService.removeZona(id);
  }

  @Get('tipos-vehiculo')
  findAllTiposVehiculo() {
    return this.catalogosService.findAllTiposVehiculo();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('tipos-vehiculo')
  createTipoVehiculo(@Body() dto: CreateTipoVehiculoDto) {
    return this.catalogosService.createTipoVehiculo(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('tipos-vehiculo/:id')
  updateTipoVehiculo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTipoVehiculoDto) {
    return this.catalogosService.updateTipoVehiculo(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete('tipos-vehiculo/:id')
  removeTipoVehiculo(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogosService.removeTipoVehiculo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Get('tarifas')
  findAllTarifas() {
    return this.catalogosService.findAllTarifas();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('tarifas')
  createTarifa(@Body() dto: CreateTarifaDto) {
    return this.catalogosService.createTarifa(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('tarifas/:id')
  updateTarifa(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTarifaDto) {
    return this.catalogosService.updateTarifa(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete('tarifas/:id')
  removeTarifa(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogosService.removeTarifa(id);
  }

  @Get('instrumentos')
  findAllInstrumentos() {
    return this.catalogosService.findAllInstrumentos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('instrumentos')
  createInstrumento(@Body() dto: CreateInstrumentoDto) {
    return this.catalogosService.createInstrumento(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('instrumentos/:id')
  updateInstrumento(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInstrumentoDto) {
    return this.catalogosService.updateInstrumento(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete('instrumentos/:id')
  removeInstrumento(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogosService.removeInstrumento(id);
  }

  @Get('agrupaciones')
  findAllAgrupaciones() {
    return this.catalogosService.findAllAgrupaciones();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('agrupaciones')
  createAgrupacion(@Body() dto: CreateAgrupacionDto) {
    return this.catalogosService.createAgrupacion(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('agrupaciones/:id')
  updateAgrupacion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgrupacionDto) {
    return this.catalogosService.updateAgrupacion(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete('agrupaciones/:id')
  removeAgrupacion(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogosService.removeAgrupacion(id);
  }
}
