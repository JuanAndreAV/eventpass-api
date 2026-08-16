import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AccesoLogService } from './acceso-log.service';
import { CreateAccesoLogDto } from './dto/create-acceso-log.dto';
import { UpdateAccesoLogDto } from './dto/update-acceso-log.dto';

@Controller('acceso-log')
export class AccesoLogController {
  constructor(private readonly accesoLogService: AccesoLogService) {}

  @Post()
  create(@Body() createAccesoLogDto: CreateAccesoLogDto) {
    return this.accesoLogService.create(createAccesoLogDto);
  }

  @Get()
  findAll() {
    return this.accesoLogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accesoLogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccesoLogDto: UpdateAccesoLogDto) {
    return this.accesoLogService.update(+id, updateAccesoLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accesoLogService.remove(+id);
  }
}
