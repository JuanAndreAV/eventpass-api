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

@Controller('escuelas')
export class EscuelasController {
  constructor(private readonly escuelasService: EscuelasService) {}

  @Post()
  create(@Body() createEscuelaDto: CreateEscuelaDto) {
    return this.escuelasService.create(createEscuelaDto);
  }

  @Get()
  findAll() {
    return this.escuelasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.escuelasService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEscuelaDto: UpdateEscuelaDto,
  ) {
    return this.escuelasService.update(id, updateEscuelaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.escuelasService.removeEscuela(id);
  }
}