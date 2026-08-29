import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ValidacionIdentidadService } from './validacion-identidad.service';
import { CreateValidacionIdentidadDto } from './dto/create-validacion-identidad.dto';
import { UpdateValidacionIdentidadDto } from './dto/update-validacion-identidad.dto';

@Controller('validacion-identidad')
export class ValidacionIdentidadController {
  constructor(private readonly validacionIdentidadService: ValidacionIdentidadService) {}

  @Post()
  create(@Body() createValidacionIdentidadDto: CreateValidacionIdentidadDto) {
    return this.validacionIdentidadService.create(createValidacionIdentidadDto);
  }

  @Get()
  findAll() {
    return this.validacionIdentidadService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.validacionIdentidadService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateValidacionIdentidadDto: UpdateValidacionIdentidadDto) {
    return this.validacionIdentidadService.update(+id, updateValidacionIdentidadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.validacionIdentidadService.remove(+id);
  }
}
