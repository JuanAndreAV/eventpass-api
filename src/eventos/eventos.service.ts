import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evento } from './entities/evento.entity';
import { Escuela } from '../escuelas/entities/escuela.entity';

@Injectable()
export class EventosService {

  constructor(
    @InjectRepository(Evento)
    private readonly eventoRepository: Repository<Evento>,
    @InjectRepository(Escuela)
    private readonly escuelaRepository: Repository<Escuela>,
  ) {}

  async createEvento(dto: CreateEventoDto): Promise<Evento> {
  let escuela: Escuela | null = null;

  if (dto.escuelaId) {
    escuela = await this.escuelaRepository.findOneBy({ id: dto.escuelaId });
    if (!escuela) {
      throw new NotFoundException(`La escuela con ID ${dto.escuelaId} no existe`);
    }
  }

  // 1. Extraemos escuelaId del DTO para no enviarlo directamente a la entidad
  const { escuelaId, ...datosEvento } = dto;

  // 2. Creamos la instancia con los datos limpios y la relación opcional
  const nuevoEvento = this.eventoRepository.create({
    ...datosEvento,
    // Asigna la entidad Escuela encontrada o undefined si no existe
    escuela: escuela ?? undefined,
  });

  return await this.eventoRepository.save(nuevoEvento);
}

  async getAllEvents(): Promise<Evento[]> {
    return await this.eventoRepository.find({ relations: { escuela: true } });
  }
  

  findAll() {
    return `This action returns all eventos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} evento`;
  }

  update(id: number, updateEventoDto: UpdateEventoDto) {
    return `This action updates a #${id} evento`;
  }

  remove(id: number) {
    return `This action removes a #${id} evento`;
  }
}
