import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escuela } from './entities/escuela.entity';
import { EquipoAsignacion } from  '../equipo-interno/entities/equipo_asignacion.entity';
import { CreateEscuelaDto } from './dto/create-escuela.dto';
import { UpdateEscuelaDto } from './dto/update-escuela.dto';

// Deben coincidir exactamente con cargos.nombre (ver seed_cargos_asignaciones.sql)
const CARGO_DIRECTOR = 'Director de escuela';
const CARGO_APOYO = 'Apoyo administrativo de escuela';
const CARGO_FORMADOR = 'Artista formador o tallerista';

export interface PersonaEscuelaView {
  id: string;
  nombreCompleto: string;
  email: string | null;
  telefono: string | null;
  detalle: string | null;
}

// Misma forma que devolvía antes (director, apoyoAdministrativo, formadores),
// pero ahora son personas del equipo interno, no usuarios.
export type EscuelaView = Omit<Escuela, 'asignaciones'> & {
  director: PersonaEscuelaView | null;
  apoyoAdministrativo: PersonaEscuelaView | null;
  formadores: PersonaEscuelaView[];
};

const RELACIONES_ASIGNACIONES = { asignaciones: { persona: true, cargo: true } } as const;

@Injectable()
export class EscuelasService {
  constructor(
    @InjectRepository(Escuela)
    private readonly escuelaRepo: Repository<Escuela>,
  ) {}

  async create(dto: CreateEscuelaDto): Promise<EscuelaView> {
    // directorId, apoyoAdministrativoId y formadoresIds están en desuso: se
    // ignoran. Director, apoyo y formadores se asignan en equipo_asignaciones.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { codigo, directorId, apoyoAdministrativoId, formadoresIds, ...rest } = dto;

    const escuela = this.escuelaRepo.create({
      ...rest,
      codigo: codigo ?? (await this.generarCodigoUnico(rest.nombre)),
    });

    const guardada = await this.escuelaRepo.save(escuela);
    return this.findOne(guardada.id);
  }

  private async generarCodigoUnico(nombre: string): Promise<string> {
    const base = nombre
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6);

    let candidato = base;
    let sufijo = 1;

    while (await this.escuelaRepo.exists({ where: { codigo: candidato } })) {
      candidato = `${base}${sufijo++}`;
    }

    return candidato;
  }

  async findAll(): Promise<EscuelaView[]> {
    const escuelas = await this.escuelaRepo.find({
      relations: RELACIONES_ASIGNACIONES,
      order: { nombre: 'ASC' },
    });
    return escuelas.map((e) => this.aVista(e));
  }

  async findOne(id: string): Promise<EscuelaView> {
    const escuela = await this.escuelaRepo.findOne({
      where: { id },
      relations: { ...RELACIONES_ASIGNACIONES, estudiantes: true },
    });

    if (!escuela) {
      throw new NotFoundException(`La escuela con ID ${id} no existe`);
    }

    return this.aVista(escuela);
  }

  async update(id: string, dto: UpdateEscuelaDto): Promise<EscuelaView> {
    // Los tres ids en desuso se ignoran (ver create).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { directorId, apoyoAdministrativoId, formadoresIds, ...rest } = dto;

    // findOneBy (sin cargar asignaciones): así save() no toca la relación
    // OneToMany y no puede desvincular asignaciones por accidente.
    const escuela = await this.escuelaRepo.findOneBy({ id });
    if (!escuela) {
      throw new NotFoundException(`La escuela con ID ${id} no existe`);
    }

    Object.assign(escuela, rest);
    await this.escuelaRepo.save(escuela);

    return this.findOne(id);
  }

  async removeEscuela(id: string) {
    const escuela = await this.escuelaRepo.findOne({
      where: { id },
    });

    if (!escuela) {
      throw new NotFoundException(`La escuela con ID ${id} no existe`);
    }

    await this.escuelaRepo.delete(id);

    return {
      message: `La escuela "${escuela.nombre}" fue eliminada correctamente`,
      id,
    };
  }

  // Arma director / apoyo / formadores a partir de las asignaciones activas.
  private aVista(escuela: Escuela): EscuelaView {
    const { asignaciones = [], ...resto } = escuela;

    const activas = asignaciones.filter(
      (a) => a.activo && a.persona && a.persona.activo !== false,
    );
    const deCargo = (nombre: string) => activas.filter((a) => a.cargo?.nombre === nombre);

    // Si hubiera más de un director o apoyo, se toma el marcado como principal
    const primero = (lista: EquipoAsignacion[]) =>
      lista.find((a) => a.principal) ?? lista[0];

    const directorAsignado = primero(deCargo(CARGO_DIRECTOR));
    const apoyoAsignado = primero(deCargo(CARGO_APOYO));

    return {
      ...resto,
      director: directorAsignado ? this.aPersona(directorAsignado) : null,
      apoyoAdministrativo: apoyoAsignado ? this.aPersona(apoyoAsignado) : null,
      formadores: deCargo(CARGO_FORMADOR).map((a) => this.aPersona(a)),
    };
  }

  private aPersona(a: EquipoAsignacion): PersonaEscuelaView {
    return {
      id: a.persona.id,
      nombreCompleto: a.persona.nombreCompleto,
      email: a.persona.email ?? null,
      telefono: a.persona.telefono ?? null,
      detalle: a.detalle,
    };
  }
}