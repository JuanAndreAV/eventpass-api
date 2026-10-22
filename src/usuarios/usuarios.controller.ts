// usuarios.controller.ts
import {
  Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles-enum/role.enum';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/update-usuario.dto';

interface UsuarioAutenticado {
  id: string;
  roles: string[];
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Crea cuentas y les asigna roles (incluido ADMIN): sin este guard,
  // cualquiera podía autoregistrarse como administrador.
  @Roles(Role.Admin)
  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Roles(Role.Admin)
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  // Cualquier cuenta autenticada puede ver un perfil (no solo el propio, como
  // ya era antes de este fix); lo que cierra es el acceso anónimo.
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Roles(Role.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  // Solo el propio usuario o un admin pueden cambiar la contraseña; el guard
  // de clase ya exige sesión, aquí falta validar que el id sea el suyo.
  @Patch(':id/password')
  changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const usuario = req.user as UsuarioAutenticado;
    const esAdmin = usuario.roles?.includes(Role.Admin);
    if (usuario.id !== id && !esAdmin) {
      throw new ForbiddenException('No puedes cambiar la contraseña de otro usuario');
    }
    return this.usuariosService.changePassword(id, dto);
  }

  @Roles(Role.Admin)
  @Patch(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}