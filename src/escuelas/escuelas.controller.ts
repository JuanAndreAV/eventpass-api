import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { EscuelasService } from './escuelas.service';
import { CreateEscuelaDto } from './dto/create-escuela.dto';
import { UpdateEscuelaDto } from './dto/update-escuela.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/roles-enum/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escuelas')
export class EscuelasController {
  constructor(private readonly escuelasService: EscuelasService) {}

  @Roles(Role.Admin)
  @Post()
  create(@Body() createEscuelaDto: CreateEscuelaDto) {
    return this.escuelasService.create(createEscuelaDto);
  }

  // Antes no exigía ningún rol (RolesGuard deja pasar si no hay @Roles):
  // cualquier cuenta autenticada, de cualquier rol, podía listar escuelas.
  @Roles(Role.Admin, Role.Secretaria)
  @Get()
  findAll() {
    return this.escuelasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.escuelasService.findOne(id);
  }

  @Roles(Role.Admin)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEscuelaDto: UpdateEscuelaDto,
  ) {
    return this.escuelasService.update(id, updateEscuelaDto);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.escuelasService.removeEscuela(id);
  }
}