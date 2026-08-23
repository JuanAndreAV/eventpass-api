// usuarios.controller.ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/update-usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post() // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get() // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'DIRECTOR')
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id') // TODO: @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id') // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @Patch(':id/password') // TODO: @UseGuards(JwtAuthGuard) — validar que id === req.user.id o sea ADMIN
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.usuariosService.changePassword(id, dto);
  }

  @Patch(':id/desactivar') // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  desactivar(@Param('id') id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Delete(':id') // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }
}