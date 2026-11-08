// equipo-interno/equipo-interno.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEquipoInternoDto, UpdateEquipoInternoDto } from './dto/equipo-interno.dto';
import { EquipoInterno } from './entities/equipo-interno.entity';
import { Cargo } from './entities/cargo.entity';

export interface CargoPersonaView {
  cargo: string;
  categoria: string;
  detalle: string | null;
  principal: boolean;
  escuelaId: string | null;
}
 
export interface EquipoInternoActivoView {
  id: string;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  tipoDocumento: EquipoInterno['tipoDocumento'];
  cargos: CargoPersonaView[];
  cargoPrincipal: CargoPersonaView | null;
}

@Injectable()
export class EquipoInternoService {
  constructor(
    @InjectRepository(EquipoInterno) private readonly personaRepo: Repository<EquipoInterno>,
    @InjectRepository(Cargo) private readonly cargoRepo: Repository<Cargo>
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
 async buscarActivo(documento: string): Promise<EquipoInternoActivoView | null> {
  const persona = await this.personaRepo.findOne({
    // OJO: no filtres asignaciones.activo dentro de este where. Convertiría el
    // join en INNER y dejaría de encontrar a quien aún no tiene cargo asignado.
    where: { documento, activo: true },
    relations: { asignaciones: { cargo: true, escuela: true } },
    select: {
      id: true,
      nombreCompleto: true,
      email: true,
      telefono: true,
      tipoDocumento: true, // antes faltaba: confirmar() leía este campo y siempre llegaba undefined
      asignaciones: {
        id: true,
        detalle: true,
        principal: true,
        activo: true,
        cargo: { id: true, nombre: true, categoria: true },
        escuela: { id: true },
      },
    },
  });
  if (!persona) return null;
 
  const cargos: CargoPersonaView[] = (persona.asignaciones ?? [])
    .filter((a) => a.activo)
    .map((a) => ({
      cargo: a.cargo.nombre,
      categoria: a.cargo.categoria,
      detalle: a.detalle ?? null,
      principal: a.principal,
      escuelaId: a.escuela?.id ?? null,
    }))
    .sort((x, y) => Number(y.principal) - Number(x.principal));
 
  return {
    id: persona.id,
    nombreCompleto: persona.nombreCompleto,
    email: persona.email ?? null,
    telefono: persona.telefono ?? null,
    tipoDocumento: persona.tipoDocumento,
    cargos,
    cargoPrincipal: cargos[0] ?? null,
  };
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
