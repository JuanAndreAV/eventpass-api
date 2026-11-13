import { Injectable } from '@nestjs/common';
import { CreateAgrupacionIntegradaDto } from './dto/create-agrupacion-integrada.dto';
import { UpdateAgrupacionIntegradaDto } from './dto/update-agrupacion-integrada.dto';

@Injectable()
export class AgrupacionIntegradaService {
  create(createAgrupacionIntegradaDto: CreateAgrupacionIntegradaDto) {
    return 'This action adds a new agrupacionIntegrada';
  }

  findAll() {
    return `This action returns all agrupacionIntegrada`;
  }

  findOne(id: number) {
    return `This action returns a #${id} agrupacionIntegrada`;
  }

  update(id: number, updateAgrupacionIntegradaDto: UpdateAgrupacionIntegradaDto) {
    return `This action updates a #${id} agrupacionIntegrada`;
  }

  remove(id: number) {
    return `This action removes a #${id} agrupacionIntegrada`;
  }
}
