import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EscuelasService } from './escuelas.service';
import { CreateEscuelaDto } from './dto/create-escuela.dto';
import { UpdateEscuelaDto } from './dto/update-escuela.dto';

@Controller('escuelas')
export class EscuelasController {
  constructor(private readonly escuelasService: EscuelasService) {}

  @Post()
  async create(@Body() createEscuelaDto: CreateEscuelaDto) {
     return await this.escuelasService.createEscuela(createEscuelaDto);
  }

  @Get()
  async findAll() {
    return await this.escuelasService.findAllEscuelas();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.escuelasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEscuelaDto: UpdateEscuelaDto) {
    return this.escuelasService.update(+id, updateEscuelaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.escuelasService.remove(+id);
  }
}
