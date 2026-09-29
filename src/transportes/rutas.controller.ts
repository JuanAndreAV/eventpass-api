import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { AsignarEscuelasRutaDto, CreateRutaDto, UpdateRutaDto } from './dto/ruta.dto';
import { RutasService } from './rutas.service';

@Controller('transportes/rutas')
export class RutasController {
  constructor(private readonly rutasService: RutasService) {}

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Transportadora)
  @Get()
  findAll() {
    return this.rutasService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Get('mapeo')
  findMapeo() {
    return this.rutasService.findMapeo();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Transportadora)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rutasService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateRutaDto) {
    return this.rutasService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRutaDto) {
    return this.rutasService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Put(':id/escuelas')
  asignarEscuelas(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarEscuelasRutaDto) {
    return this.rutasService.asignarEscuelas(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rutasService.remove(id);
  }
}
