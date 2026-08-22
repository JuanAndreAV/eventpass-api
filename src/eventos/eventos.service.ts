import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
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

  async create(dto: CreateEventoDto): Promise<Evento> {
    const escuela = await this.resolverEscuela(dto.escuelaId);

    // Extraemos escuelaId del DTO para no enviarlo directamente a la entidad
    const { escuelaId, ...datosEvento } = dto;

    const nuevoEvento = this.eventoRepository.create({
      ...datosEvento,
      escuela: escuela ?? undefined,
    });

    return await this.eventoRepository.save(nuevoEvento);
  }

  async findAll(): Promise<Evento[]> {
    return await this.eventoRepository.find({
      relations: { escuela: true },
      order: { fechaInicio: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Evento> {
    const evento = await this.eventoRepository.findOne({
      where: { id },
      relations: { escuela: true },
    });

    if (!evento) {
      throw new NotFoundException(`El evento con ID ${id} no existe`);
    }

    return evento;
  }

  async update(id: string, dto: UpdateEventoDto): Promise<Evento> {
    // Reutiliza findOne para validar que exista y traer la relación actual
    const evento = await this.findOne(id);

    // Si mandan escuelaId (incluso null explícito para desasociar), lo resolvemos
    if (dto.escuelaId !== undefined) {
      evento.escuela = (await this.resolverEscuela(dto.escuelaId)) ?? undefined;
    }

    const { escuelaId, ...datosEvento } = dto;

    Object.assign(evento, datosEvento);

    return await this.eventoRepository.save(evento);
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const evento = await this.findOne(id);
    await this.eventoRepository.remove(evento);
    return { mensaje: `Evento ${id} eliminado correctamente` };
  }

  // Helper compartido entre create() y update() para no repetir la validación
  private async resolverEscuela(escuelaId?: string): Promise<Escuela | null> {
    if (!escuelaId) return null;

    const escuela = await this.escuelaRepository.findOneBy({ id: escuelaId });
    if (!escuela) {
      throw new NotFoundException(`La escuela con ID ${escuelaId} no existe`);
    }

    return escuela;
  }
}