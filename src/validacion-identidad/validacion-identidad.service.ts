import { Injectable } from '@nestjs/common';
import { CreateValidacionIdentidadDto } from './dto/create-validacion-identidad.dto';
import { UpdateValidacionIdentidadDto } from './dto/update-validacion-identidad.dto';

@Injectable()
export class ValidacionIdentidadService {
  create(createValidacionIdentidadDto: CreateValidacionIdentidadDto) {
    return 'This action adds a new validacionIdentidad';
  }

  findAll() {
    return `This action returns all validacionIdentidad`;
  }

  findOne(id: number) {
    return `This action returns a #${id} validacionIdentidad`;
  }

  update(id: number, updateValidacionIdentidadDto: UpdateValidacionIdentidadDto) {
    return `This action updates a #${id} validacionIdentidad`;
  }

  remove(id: number) {
    return `This action removes a #${id} validacionIdentidad`;
  }
}
