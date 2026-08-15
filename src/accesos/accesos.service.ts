import { Injectable } from '@nestjs/common';
import { CreateAccesoDto } from './dto/create-acceso.dto';
import { UpdateAccesoDto } from './dto/update-acceso.dto';

@Injectable()
export class AccesosService {
  create(createAccesoDto: CreateAccesoDto) {
    return 'This action adds a new acceso';
  }

  findAll() {
    return `This action returns all accesos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} acceso`;
  }

  update(id: number, updateAccesoDto: UpdateAccesoDto) {
    return `This action updates a #${id} acceso`;
  }

  remove(id: number) {
    return `This action removes a #${id} acceso`;
  }
}
