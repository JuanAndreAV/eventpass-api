import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { Ruta } from './entities/ruta.entity';
import { EscuelaRuta } from './entities/escuela-ruta.entity';
import { Zona } from './entities/zona.entity';
import { AsignarEscuelasRutaDto, CreateRutaDto, UpdateRutaDto } from './dto/ruta.dto';

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta) private readonly rutaRepo: Repository<Ruta>,
    @InjectRepository(EscuelaRuta) private readonly mapeoRepo: Repository<EscuelaRuta>,
  ) {}

  findAll(): Promise<Ruta[]> {
    return this.rutaRepo.find({
      relations: { zona: true, escuelas: { escuela: true } },
      order: { codigo: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Ruta> {
    const ruta = await this.rutaRepo.findOne({
      where: { id },
      relations: { zona: true, escuelas: { escuela: true } },
    });
    if (!ruta) throw new NotFoundException(`La ruta con ID ${id} no existe`);
    return ruta;
  }

  create(dto: CreateRutaDto): Promise<Ruta> {
    const { zonaId, ...rest } = dto;
    return this.rutaRepo.save(this.rutaRepo.create({ ...rest, zona: { id: zonaId } as Zona }));
  }

  async update(id: string, dto: UpdateRutaDto): Promise<Ruta> {
    const ruta = await this.findOne(id);
    const { zonaId, ...rest } = dto;
    Object.assign(ruta, rest);
    if (zonaId) ruta.zona = { id: zonaId } as Zona;
    return this.rutaRepo.save(ruta);
  }

  async remove(id: string) {
    const ruta = await this.findOne(id);
    await this.rutaRepo.delete(id);
    return { message: `La ruta "${ruta.nombre}" fue eliminada correctamente`, id };
  }

  findMapeo(): Promise<EscuelaRuta[]> {
    return this.mapeoRepo.find({ relations: { escuela: true, ruta: true } });
  }

  // Reemplaza el conjunto de escuelas de la ruta. Una escuela pertenece a una sola
  // ruta, así que asignarla aquí la desvincula de la ruta que la tuviera antes.
  async asignarEscuelas(rutaId: string, dto: AsignarEscuelasRutaDto): Promise<EscuelaRuta[]> {
    await this.findOne(rutaId);

    await this.mapeoRepo.delete({ ruta: { id: rutaId } });
    if (dto.escuelasIds.length > 0) {
      await this.mapeoRepo.delete({ escuela: { id: In(dto.escuelasIds) } });
      await this.mapeoRepo.save(
        dto.escuelasIds.map((escuelaId) =>
          this.mapeoRepo.create({
            escuela: { id: escuelaId } as Escuela,
            ruta: { id: rutaId } as Ruta,
          }),
        ),
      );
    }

    return this.mapeoRepo.find({
      where: { ruta: { id: rutaId } },
      relations: { escuela: true, ruta: true },
    });
  }

  async findRutaDeEscuela(escuelaId: string): Promise<Ruta | null> {
    const mapeo = await this.mapeoRepo.findOne({
      where: { escuela: { id: escuelaId } },
      relations: { ruta: { zona: true } },
    });
    return mapeo?.ruta ?? null;
  }
}
