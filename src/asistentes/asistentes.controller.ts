import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AsistentesService } from './asistentes.service';
import { CreateAsistenteDto } from './dto/create-asistente.dto';
import { UpdateAsistenteDto } from './dto/update-asistente.dto';

@Controller('asistentes')
export class AsistentesController {
  constructor(private readonly asistentesService: AsistentesService) {}

  @Post()
  create(@Body() createAsistenteDto: CreateAsistenteDto) {
    return this.asistentesService.create(createAsistenteDto);
  }

  @Get()
  findAll() {
    return this.asistentesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.asistentesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAsistenteDto: UpdateAsistenteDto) {
    return this.asistentesService.update(+id, updateAsistenteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.asistentesService.remove(+id);
  }
}
