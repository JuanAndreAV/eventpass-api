import { BadGatewayException, Injectable } from '@nestjs/common';
import { Escuela } from './entities/escuela.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEscuelaDto } from './dto/create-escuela.dto';
import { UpdateEscuelaDto } from './dto/update-escuela.dto';

@Injectable()
export class EscuelasService {

  constructor(
    @InjectRepository(Escuela)
    private readonly escuelaRepository: Repository<Escuela>
  ){}

  async createEscuela(escuelaData: CreateEscuelaDto) {
    const findExistingEscuela = await this.escuelaRepository.findOne({ where: { codigo: escuelaData.nombre } });
    if (findExistingEscuela) {
      throw new BadGatewayException(`Ya existe una escuela con el nombre ${escuelaData.nombre}`);
    }
    const escuela = this.escuelaRepository.create(escuelaData);
    return await this.escuelaRepository.save(escuela);

  };
  

  async findAllEscuelas() {
    const escuelas = await this.escuelaRepository.find();
    return escuelas;
    
  }

  findOne(id: number) {
    return `This action returns a #${id} escuela`;
  }

  update(id: number, updateEscuelaDto: UpdateEscuelaDto) {
    return `This action updates a #${id} escuela`;
  }

  remove(id: number) {
    return `This action removes a #${id} escuela`;
  }
}
