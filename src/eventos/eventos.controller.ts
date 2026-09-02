import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post()
  async create(@Body() createEventoDto: CreateEventoDto) {
    return await this.eventosService.create(createEventoDto);
  }

  @Get()
  async findAll() {
    return await this.eventosService.findAll();
  }
  // eventos/eventos.controller.ts — nuevo endpoint
  @Get('activos')
  async findActivos() {
    return await this.eventosService.findActivos();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.eventosService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateEventoDto: UpdateEventoDto) {
    return await this.eventosService.update(id, updateEventoDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.eventosService.remove(id);
  }
}