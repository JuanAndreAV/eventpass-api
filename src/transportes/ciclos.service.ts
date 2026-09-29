import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Agrupacion } from './entities/agrupacion.entity';
import { Ciclo, EstadoCiclo } from './entities/ciclo.entity';
import { CreateCicloDto, UpdateCicloDto } from './dto/ciclo.dto';

@Injectable()
export class CiclosService {
  constructor(
    @InjectRepository(Ciclo) private readonly cicloRepo: Repository<Ciclo>,
    @InjectRepository(Agrupacion) private readonly agrupacionRepo: Repository<Agrupacion>,
  ) {}

  findAll(): Promise<Ciclo[]> {
    return this.cicloRepo.find({
      relations: { agrupaciones: true },
      order: { fechaEvento: 'DESC' },
    });
  }

  // Los ciclos que un solicitante puede diligenciar ahora mismo.
  async findAbiertos(): Promise<Ciclo[]> {
    const ciclos = await this.cicloRepo.find({
      where: { estado: EstadoCiclo.ABIERTO },
      // La ruta de la agrupación la necesita el formulario público: si es de un
      // solo recorrido, no puede ofrecer el trayecto de regreso.
      relations: { agrupaciones: { ruta: true } },
      order: { fechaEvento: 'ASC' },
    });
    const ahora = new Date();
    return ciclos.filter((ciclo) => ciclo.fechaCierre > ahora);
  }

  async findOne(id: string): Promise<Ciclo> {
    const ciclo = await this.cicloRepo.findOne({
      where: { id },
      relations: { agrupaciones: true, creadoPor: true },
    });
    if (!ciclo) throw new NotFoundException(`El ciclo con ID ${id} no existe`);
    return ciclo;
  }

  async create(dto: CreateCicloDto, usuarioId?: string): Promise<Ciclo> {
    const { agrupacionesIds, fechaEvento, fechaCierre, ...rest } = dto;
    this.validarFechas(fechaEvento, fechaCierre);

    const ciclo = this.cicloRepo.create({
      ...rest,
      fechaEvento: new Date(fechaEvento),
      fechaCierre: new Date(fechaCierre),
      agrupaciones: await this.resolverAgrupaciones(agrupacionesIds),
      creadoPor: usuarioId ? ({ id: usuarioId } as Usuario) : null,
    });

    return this.cicloRepo.save(ciclo);
  }

  async update(id: string, dto: UpdateCicloDto): Promise<Ciclo> {
    const ciclo = await this.findOne(id);
    const { agrupacionesIds, fechaEvento, fechaCierre, ...rest } = dto;

    this.validarFechas(
      fechaEvento ?? ciclo.fechaEvento.toISOString(),
      fechaCierre ?? ciclo.fechaCierre.toISOString(),
    );

    Object.assign(ciclo, rest);
    if (fechaEvento) ciclo.fechaEvento = new Date(fechaEvento);
    if (fechaCierre) ciclo.fechaCierre = new Date(fechaCierre);
    if (agrupacionesIds) ciclo.agrupaciones = await this.resolverAgrupaciones(agrupacionesIds);

    return this.cicloRepo.save(ciclo);
  }

  async cambiarEstado(id: string, estado: EstadoCiclo): Promise<Ciclo> {
    const ciclo = await this.findOne(id);
    ciclo.estado = estado;
    return this.cicloRepo.save(ciclo);
  }

  async remove(id: string) {
    const ciclo = await this.findOne(id);
    await this.cicloRepo.delete(id);
    return { message: `El ciclo "${ciclo.nombre}" fue eliminado correctamente`, id };
  }

  private validarFechas(fechaEvento: string, fechaCierre: string): void {
    if (new Date(fechaCierre) > new Date(fechaEvento)) {
      throw new BadRequestException('La fecha de cierre no puede ser posterior a la del evento');
    }
  }

  private async resolverAgrupaciones(ids: string[]): Promise<Agrupacion[]> {
    if (ids.length === 0) {
      throw new BadRequestException('El ciclo debe convocar al menos una agrupación');
    }

    const agrupaciones = await this.agrupacionRepo.findBy({ id: In(ids) });
    if (agrupaciones.length !== ids.length) {
      throw new BadRequestException('Alguna de las agrupaciones indicadas no existe');
    }

    return agrupaciones;
  }
}
