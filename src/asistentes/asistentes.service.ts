import { Injectable } from '@nestjs/common';
import { CreateAsistenteDto } from './dto/create-asistente.dto';
import { UpdateAsistenteDto } from './dto/update-asistente.dto';

@Injectable()
export class AsistentesService {
  create(createAsistenteDto: CreateAsistenteDto) {
    return 'This action adds a new asistente';
  }

  findAll() {
    return `This action returns all asistentes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} asistente`;
  }

  update(id: number, updateAsistenteDto: UpdateAsistenteDto) {
    return `This action updates a #${id} asistente`;
  }

  remove(id: number) {
    return `This action removes a #${id} asistente`;
  }
}
