// equipo-interno/equipo-interno.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEquipoInternoDto, UpdateEquipoInternoDto } from './dto/equipo-interno.dto';
import { EquipoInterno } from './entities/equipo-interno.entity';

@Injectable()
export class EquipoInternoService {
  constructor(
    @InjectRepository(EquipoInterno) private readonly personaRepo: Repository<EquipoInterno>,
  ) {}

  // Lo usa inscripcion-red.service.ts para la categoría EQUIPO_INTERNO: si el
  // documento no está aquí (y activo), no se le puede asignar esa categoría
  // solo porque eligió ese rol en el formulario público.
  async existeActivo(documento: string): Promise<boolean> {
    return this.personaRepo.exists({ where: { documento, activo: true } });
  }

  // Igual que existeActivo, pero con los datos (nombre, correo, teléfono)
  // para que inscripcion-red pueda autocompletar el registro de equipo
  // interno sin volver a pedírselos.
  async buscarActivo(documento: string): Promise<EquipoInterno | null> {
    return this.personaRepo.findOne({
      where: { documento, activo: true },
      select: { id: true, nombreCompleto: true, email: true, telefono: true },
    });
  }

  async findAll(): Promise<EquipoInterno[]> {
    return this.personaRepo.find({ order: { nombreCompleto: 'ASC' } });
  }

  async findOne(id: string): Promise<EquipoInterno> {
    const persona = await this.personaRepo.findOne({ where: { id } });
    if (!persona) throw new NotFoundException(`No existe una persona de equipo interno con ID ${id}`);
    return persona;
  }

  async create(dto: CreateEquipoInternoDto): Promise<EquipoInterno> {
    const persona = this.personaRepo.create(dto);
    return this.personaRepo.save(persona);
  }

  async update(id: string, dto: UpdateEquipoInternoDto): Promise<EquipoInterno> {
    const persona = await this.findOne(id);
    Object.assign(persona, dto);
    await this.personaRepo.save(persona);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const persona = await this.findOne(id);
    await this.personaRepo.remove(persona);
    return { mensaje: 'Persona de equipo interno eliminada' };
  }
}
