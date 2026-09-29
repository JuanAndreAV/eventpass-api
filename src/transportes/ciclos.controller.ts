import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, Res,
  StreamableFile, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { CalculoService } from './calculo.service';
import { CiclosService } from './ciclos.service';
import { DocumentosService } from './documentos.service';
import { CambiarEstadoCicloDto, CreateCicloDto, UpdateCicloDto } from './dto/ciclo.dto';
import type { UsuarioAutenticado } from './solicitudes.service';

@Controller('transportes/ciclos')
export class CiclosController {
  constructor(
    private readonly ciclosService: CiclosService,
    private readonly calculoService: CalculoService,
    private readonly documentosService: DocumentosService,
  ) {}

  // Abierto: el formulario público necesita saber a qué convocatoria inscribirse.
  @Get('abiertos')
  findAbiertos() {
    return this.ciclosService.findAbiertos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Transportadora)
  @Get()
  findAll() {
    return this.ciclosService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Secretaria, Role.Transportadora)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ciclosService.findOne(id);
  }

  // Rutas, puestos, vehículo y costo a partir de las solicitudes aprobadas.
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Transportadora)
  @Get(':id/calculo')
  calcular(@Param('id', ParseUUIDPipe) id: string) {
    return this.calculoService.calcular(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Transportadora)
  @Get(':id/documentos/costo.pdf')
  async costoPdf(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const archivo = await this.documentosService.costoPdf(id);
    res.set(this.cabeceras('application/pdf', await this.documentosService.nombreArchivo(id, 'costo.pdf')));
    return new StreamableFile(archivo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Transportadora)
  @Get(':id/documentos/rutas.pdf')
  async rutasPdf(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const archivo = await this.documentosService.rutasPdf(id);
    res.set(this.cabeceras('application/pdf', await this.documentosService.nombreArchivo(id, 'rutas.pdf')));
    return new StreamableFile(archivo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin, Role.Transportadora)
  @Get(':id/documentos/libro.xlsx')
  async libroExcel(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const archivo = await this.documentosService.libroExcel(id);
    res.set(
      this.cabeceras(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        await this.documentosService.nombreArchivo(id, 'xlsx'),
      ),
    );
    return new StreamableFile(archivo);
  }

  private cabeceras(tipo: string, nombre: string): Record<string, string> {
    return {
      'Content-Type': tipo,
      'Content-Disposition': `attachment; filename="${nombre}"`,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateCicloDto, @Req() req: Request) {
    return this.ciclosService.create(dto, (req.user as UsuarioAutenticado)?.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCicloDto) {
    return this.ciclosService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch(':id/estado')
  cambiarEstado(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CambiarEstadoCicloDto) {
    return this.ciclosService.cambiarEstado(id, dto.estado);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ciclosService.remove(id);
  }
}
