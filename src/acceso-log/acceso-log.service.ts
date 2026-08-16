import { Injectable } from '@nestjs/common';
import { CreateAccesoLogDto } from './dto/create-acceso-log.dto';
import { UpdateAccesoLogDto } from './dto/update-acceso-log.dto';

@Injectable()
export class AccesoLogService {
  create(createAccesoLogDto: CreateAccesoLogDto) {
    return 'This action adds a new accesoLog';
  }

  findAll() {
    return `This action returns all accesoLog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} accesoLog`;
  }

  update(id: number, updateAccesoLogDto: UpdateAccesoLogDto) {
    return `This action updates a #${id} accesoLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} accesoLog`;
  }
}
