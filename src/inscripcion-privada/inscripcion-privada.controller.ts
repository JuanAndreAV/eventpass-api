// inscripcion-privada/inscripcion-privada.controller.ts
import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post,
  Query, StreamableFile, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import {
  ActualizarConfiguracionDto, ActualizarCupoDto, ActualizarTodosCuposDto, CrearConfiguracionDto,
  CrearEventoPrivadoDto,
  InscribirAgrupacionDto, InscribirEscuelaDto,
} from './dto/create-inscripcion-privada.dto';
import { InscripcionPrivadaService } from './inscripcion-privada.service';

@Controller('inscripcion-privada')
export class InscripcionPrivadaController {
  constructor(private readonly service: InscripcionPrivadaService) {}

  // ================= ADMINISTRACIÓN =================
  // Prefijo "admin/" para que nunca se confunda con ":token". Si tienes
  // @nestjs/throttler, limita también las rutas públicas de más abajo.

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('admin/eventos/:eventoId')
  crearConfiguracion(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Body() dto: CrearConfiguracionDto,
  ) {
    return this.service.crearConfiguracion(eventoId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Get('admin/eventos/:eventoId')
  resumen(@Param('eventoId', ParseUUIDPipe) eventoId: string) {
    return this.service.resumen(eventoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('admin/eventos/:eventoId')
  actualizarConfiguracion(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Body() dto: ActualizarConfiguracionDto,
  ) {
    return this.service.actualizarConfiguracion(eventoId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('admin/eventos/:eventoId/token')
  @HttpCode(200)
  regenerarToken(@Param('eventoId', ParseUUIDPipe) eventoId: string) {
    return this.service.regenerarToken(eventoId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('admin/cupos/:cupoId')
  actualizarCupo(
    @Param('cupoId', ParseUUIDPipe) cupoId: string,
    @Body() dto: ActualizarCupoDto,
  ) {
    return this.service.actualizarCupo(cupoId, dto.cupo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
@Get('admin')
listar() {
  return this.service.listar();
}
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('admin/eventos')
  crearEventoPrivado(@Body() dto: CrearEventoPrivadoDto) {
    return this.service.crearEventoPrivado(dto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Patch('admin/eventos/:eventoId/cupos')
  actualizarTodosLosCupos(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Body() dto: ActualizarTodosCuposDto,
  ) {
    return this.service.actualizarTodosLosCupos(eventoId, dto.cupo);
  }
    @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('admin/eventos/:eventoId/cupos/sincronizar')
  @HttpCode(200)
  sincronizarCupos(@Param('eventoId', ParseUUIDPipe) eventoId: string) {
    return this.service.sincronizarCupos(eventoId);
  }

  // ---------- Preinscritos de escuelas (Excel del director) ----------

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Get('admin/eventos/:eventoId/escuelas/:escuelaId/plantilla')
  async plantilla(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Param('escuelaId', ParseUUIDPipe) escuelaId: string,
  ) {
    const { archivo, nombre } = await this.service.plantillaEscuela(eventoId, escuelaId);
    return new StreamableFile(archivo, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${nombre}"`,
    });
  }

  // POST ...?dry=true (por defecto) solo valida; ?dry=false guarda. Multipart, campo "file".
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Post('admin/eventos/:eventoId/escuelas/:escuelaId/preinscritos')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importarPreinscritos(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Param('escuelaId', ParseUUIDPipe) escuelaId: string,
    @UploadedFile() file: { originalname: string; buffer: Buffer } | undefined,
    @Query('dry') dry?: string,
  ) {
    if (!file) throw new BadRequestException('Falta el archivo (campo "file").');
    if (!/\.xlsx$/i.test(file.originalname)) throw new BadRequestException('El archivo debe ser .xlsx');
    return this.service.importarPreinscritos(eventoId, escuelaId, file.buffer, dry !== 'false');
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Get('admin/eventos/:eventoId/escuelas/:escuelaId/preinscritos')
  listarPreinscritos(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Param('escuelaId', ParseUUIDPipe) escuelaId: string,
  ) {
    return this.service.listarPreinscritos(eventoId, escuelaId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.Admin)
  @Delete('admin/preinscritos/:asistenteId')
  eliminarPreinscrito(@Param('asistenteId', ParseUUIDPipe) asistenteId: string) {
    return this.service.eliminarPreinscrito(asistenteId);
  }

  // ================= PÚBLICO: se entra con el token del enlace =================

  // Datos del evento y qué modalidades están habilitadas.
  @Get(':token')
  info(@Param('token') token: string) {
    return this.service.info(token);
  }

  // Escuelas con las boletas que les quedan.
  @Get(':token/escuelas')
  escuelas(@Param('token') token: string) {
    return this.service.escuelasDisponibles(token);
  }

  // Paso 1 de escuelas: el estudiante preinscrito por su escuela confirma con su documento.
  @Get(':token/escuela/:documento')
  consultarEscuela(@Param('token') token: string, @Param('documento') documento: string) {
    return this.service.consultarEscuela(token, documento);
  }

  @Post(':token/escuela')
  inscribirEscuela(@Param('token') token: string, @Body() dto: InscribirEscuelaDto) {
    return this.service.inscribirEscuela(token, dto);
  }

  // Paso 1 de agrupaciones: confirma que el documento participa (nombre enmascarado).
  @Get(':token/agrupacion/:documento')
  consultarAgrupacion(@Param('token') token: string, @Param('documento') documento: string) {
    return this.service.consultarAgrupacion(token, documento);
  }

  @Post(':token/agrupacion')
  inscribirAgrupacion(@Param('token') token: string, @Body() dto: InscribirAgrupacionDto) {
    return this.service.inscribirAgrupacion(token, dto);
  }
}
