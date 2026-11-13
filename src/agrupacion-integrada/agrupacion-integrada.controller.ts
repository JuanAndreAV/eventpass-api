import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AgrupacionIntegradaService } from './agrupacion-integrada.service';
import { CreateAgrupacionIntegradaDto } from './dto/create-agrupacion-integrada.dto';
import { UpdateAgrupacionIntegradaDto } from './dto/update-agrupacion-integrada.dto';

@Controller('agrupacion-integrada')
export class AgrupacionIntegradaController {
  constructor(private readonly agrupacionIntegradaService: AgrupacionIntegradaService) {}

  @Post()
  create(@Body() createAgrupacionIntegradaDto: CreateAgrupacionIntegradaDto) {
    return this.agrupacionIntegradaService.create(createAgrupacionIntegradaDto);
  }

  @Get()
  findAll() {
    return this.agrupacionIntegradaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agrupacionIntegradaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAgrupacionIntegradaDto: UpdateAgrupacionIntegradaDto) {
    return this.agrupacionIntegradaService.update(+id, updateAgrupacionIntegradaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agrupacionIntegradaService.remove(+id);
  }
}
