// roles.controller.ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { RolService } from './rol.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Controller('roles')
export class RolController {
  constructor(private readonly rolesService: RolService) {}

  @Post() // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  create(@Body() dto: CreateRolDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id') // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateRolDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id') // TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}