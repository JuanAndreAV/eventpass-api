// equipo-interno/equipo-interno.service.ts
import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { AgrupacionIntegrada } from '../agrupacion-integrada/entities/agrupacion-integrada.entity';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { AsignacionDto, CreateEquipoInternoDto, UpdateEquipoInternoDto } from './dto/equipo-interno.dto';
import { EquipoInterno, EstadoDatosPersona } from './entities/equipo-interno.entity';
import { Cargo } from './entities/cargo.entity';
import { EquipoAsignacion } from './entities/equipo_asignacion.entity';

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
    @InjectRepository(Cargo) private readonly cargoRepo: Repository<Cargo>,
    private readonly dataSource: DataSource,
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

  // ---------------------------------------------------------------------------
  // Panel de administración
  // ---------------------------------------------------------------------------

  // Catálogos para los filtros y el formulario del panel
  async catalogos() {
    const [cargos, escuelas, agrupaciones] = await Promise.all([
      this.cargoRepo.find({
        select: { id: true, nombre: true, categoria: true, requiereEscuela: true },
        order: { categoria: 'ASC', nombre: 'ASC' },
      }),
      this.dataSource.getRepository(Escuela).find({
        select: { id: true, nombre: true, activa: true },
        order: { nombre: 'ASC' },
      }),
      this.dataSource.getRepository(AgrupacionIntegrada).find({
        select: { id: true, nombre: true, activa: true },
        order: { nombre: 'ASC' },
      }),
    ]);
    return { cargos, escuelas, agrupaciones };
  }

  async findAll(): Promise<EquipoInterno[]> {
    const personas = await this.personaRepo.find({
      relations: { asignaciones: { cargo: true, escuela: true, agrupacion: true } },
      select: this.seleccionPanel(),
      order: { nombreCompleto: 'ASC' },
    });
    personas.forEach((p) => this.ordenarAsignaciones(p));
    return personas;
  }

  async findOne(id: string): Promise<EquipoInterno> {
    const persona = await this.personaRepo.findOne({
      where: { id },
      relations: { asignaciones: { cargo: true, escuela: true, agrupacion: true } },
      select: this.seleccionPanel(),
    });
    if (!persona) throw new NotFoundException(`No existe una persona de equipo interno con ID ${id}`);
    return this.ordenarAsignaciones(persona);
  }

  async create(dto: CreateEquipoInternoDto): Promise<EquipoInterno> {
    const { asignaciones, ...datos } = dto;
    const id = await this.enTransaccion(async (em) => {
      const persona = em.create(EquipoInterno, { ...datos, estadoDatos: this.estadoDatos(datos) });
      const guardada = await em.save(persona);
      if (asignaciones) await this.sincronizarAsignaciones(em, guardada.id, asignaciones);
      return guardada.id;
    });
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateEquipoInternoDto): Promise<EquipoInterno> {
    const { asignaciones, ...datos } = dto;
    await this.enTransaccion(async (em) => {
      const persona = await em.findOne(EquipoInterno, { where: { id } });
      if (!persona) throw new NotFoundException(`No existe una persona de equipo interno con ID ${id}`);
      Object.assign(persona, datos);
      persona.estadoDatos = this.estadoDatos(persona);
      await em.save(persona);
      if (asignaciones) await this.sincronizarAsignaciones(em, id, asignaciones);
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const persona = await this.personaRepo.findOne({ where: { id } });
    if (!persona) throw new NotFoundException(`No existe una persona de equipo interno con ID ${id}`);
    // equipo_asignaciones tiene ON DELETE CASCADE
    await this.personaRepo.remove(persona);
    return { mensaje: `${persona.nombreCompleto} fue eliminado del equipo interno` };
  }

  // Reemplaza las asignaciones de la persona por la lista recibida:
  // con id → se actualiza, sin id → se crea, las que no vienen → se eliminan.
  private async sincronizarAsignaciones(em: EntityManager, personaId: string, lista: AsignacionDto[]) {
    for (const a of lista) {
      if (a.escuelaId && a.agrupacionId) {
        throw new BadRequestException('Cada cargo se asigna a una escuela o a una agrupación, no a ambas');
      }
    }

    const claves = lista.map((a) => `${a.cargoId}|${a.escuelaId ?? ''}|${a.agrupacionId ?? ''}`);
    if (new Set(claves).size !== claves.length) {
      throw new BadRequestException('Hay cargos repetidos para el mismo lugar');
    }

    const cargoIds = [...new Set(lista.map((a) => a.cargoId))];
    if (cargoIds.length) {
      const encontrados = await em.count(Cargo, { where: { id: In(cargoIds) } });
      if (encontrados !== cargoIds.length) throw new BadRequestException('Alguno de los cargos no existe');
    }

    const actuales = await em.find(EquipoAsignacion, {
      where: { persona: { id: personaId } },
      select: { id: true },
    });
    const idsRecibidos = new Set(lista.filter((a) => a.id).map((a) => a.id));
    const aEliminar = actuales.filter((a) => !idsRecibidos.has(a.id)).map((a) => a.id);
    // Se borra primero para que re-crear una combinación eliminada no choque
    // con el índice único.
    if (aEliminar.length) await em.delete(EquipoAsignacion, { id: In(aEliminar) });

    const idsActuales = new Set(actuales.map((a) => a.id));
    // Exactamente una principal: la marcada, o la primera si no hay ninguna
    const indicePrincipal = Math.max(0, lista.findIndex((a) => a.principal));

    for (const [i, a] of lista.entries()) {
      if (a.id && !idsActuales.has(a.id)) {
        throw new BadRequestException('Una de las asignaciones no pertenece a esta persona');
      }
      await em.save(EquipoAsignacion, {
        ...(a.id ? { id: a.id } : {}),
        persona: { id: personaId },
        cargo: { id: a.cargoId },
        escuela: a.escuelaId ? { id: a.escuelaId } : null,
        agrupacion: a.agrupacionId ? { id: a.agrupacionId } : null,
        detalle: a.detalle ?? null,
        principal: i === indicePrincipal,
        activo: true,
      });
    }
  }

  private estadoDatos(p: { documento?: string | null; tipoDocumento?: unknown }): EstadoDatosPersona {
    return p.documento && p.tipoDocumento ? EstadoDatosPersona.COMPLETO : EstadoDatosPersona.PENDIENTE;
  }

  private ordenarAsignaciones(persona: EquipoInterno): EquipoInterno {
    persona.asignaciones?.sort((x, y) => Number(y.principal) - Number(x.principal));
    return persona;
  }

  private seleccionPanel() {
    return {
      id: true, nombreCompleto: true, tipoDocumento: true, documento: true, email: true,
      telefono: true, estadoDatos: true, activo: true, tipoContrato: true,
      creadoEn: true, actualizadoEn: true,
      asignaciones: {
        id: true, detalle: true, principal: true, activo: true,
        cargo: { id: true, nombre: true, categoria: true, requiereEscuela: true },
        escuela: { id: true, nombre: true },
        agrupacion: { id: true, nombre: true },
      },
    } as const;
  }

  // Traduce las violaciones de restricciones de Postgres a mensajes legibles
  private async enTransaccion<T>(trabajo: (em: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(trabajo);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        const { code, constraint, detail } = err.driverError ?? {};
        if (code === '23505') {
          if (String(detail ?? '').includes('documento')) {
            throw new ConflictException('Ya existe una persona del equipo interno con ese documento');
          }
          throw new ConflictException('Esa persona ya tiene ese cargo asignado en ese lugar');
        }
        if (code === '23503') throw new BadRequestException('La escuela, agrupación o cargo seleccionado no existe');
        if (code === '23514' && constraint === 'chk_equipo_tipo_contrato') {
          throw new BadRequestException('Tipo de contrato no válido');
        }
      }
      throw err;
    }
  }
}
