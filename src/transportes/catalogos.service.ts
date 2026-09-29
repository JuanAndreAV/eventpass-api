import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { Zona } from './entities/zona.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { Tarifa } from './entities/tarifa.entity';
import { Instrumento } from './entities/instrumento.entity';
import { Agrupacion } from './entities/agrupacion.entity';
import { Ruta } from './entities/ruta.entity';
import { CreateZonaDto, UpdateZonaDto } from './dto/zona.dto';
import { CreateTipoVehiculoDto, UpdateTipoVehiculoDto } from './dto/tipo-vehiculo.dto';
import { CreateTarifaDto, UpdateTarifaDto } from './dto/tarifa.dto';
import { CreateInstrumentoDto, UpdateInstrumentoDto } from './dto/instrumento.dto';
import { CreateAgrupacionDto, UpdateAgrupacionDto } from './dto/agrupacion.dto';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Zona) private readonly zonaRepo: Repository<Zona>,
    @InjectRepository(TipoVehiculo) private readonly tipoVehiculoRepo: Repository<TipoVehiculo>,
    @InjectRepository(Tarifa) private readonly tarifaRepo: Repository<Tarifa>,
    @InjectRepository(Instrumento) private readonly instrumentoRepo: Repository<Instrumento>,
    @InjectRepository(Agrupacion) private readonly agrupacionRepo: Repository<Agrupacion>,
    @InjectRepository(Escuela) private readonly escuelaRepo: Repository<Escuela>,
  ) {}

  // Lista mínima para el formulario público, que no puede consultar /escuelas (requiere sesión).
  findEscuelasParaFormulario(): Promise<Pick<Escuela, 'id' | 'nombre'>[]> {
    return this.escuelaRepo.find({
      where: { activa: true },
      select: { id: true, nombre: true },
      order: { nombre: 'ASC' },
    });
  }

  // --- Zonas ---

  findAllZonas(): Promise<Zona[]> {
    return this.zonaRepo.find({ order: { nombre: 'ASC' } });
  }

  createZona(dto: CreateZonaDto): Promise<Zona> {
    return this.zonaRepo.save(this.zonaRepo.create(dto));
  }

  async updateZona(id: string, dto: UpdateZonaDto): Promise<Zona> {
    const zona = await this.zonaRepo.findOneBy({ id });
    if (!zona) throw new NotFoundException(`La zona con ID ${id} no existe`);
    Object.assign(zona, dto);
    return this.zonaRepo.save(zona);
  }

  async removeZona(id: string) {
    const zona = await this.zonaRepo.findOneBy({ id });
    if (!zona) throw new NotFoundException(`La zona con ID ${id} no existe`);
    await this.zonaRepo.delete(id);
    return { message: `La zona "${zona.nombre}" fue eliminada correctamente`, id };
  }

  // --- Tipos de vehículo ---

  findAllTiposVehiculo(): Promise<TipoVehiculo[]> {
    return this.tipoVehiculoRepo.find({ order: { puestosMin: 'ASC' } });
  }

  createTipoVehiculo(dto: CreateTipoVehiculoDto): Promise<TipoVehiculo> {
    return this.tipoVehiculoRepo.save(this.tipoVehiculoRepo.create(dto));
  }

  async updateTipoVehiculo(id: string, dto: UpdateTipoVehiculoDto): Promise<TipoVehiculo> {
    const tipo = await this.tipoVehiculoRepo.findOneBy({ id });
    if (!tipo) throw new NotFoundException(`El tipo de vehículo con ID ${id} no existe`);
    Object.assign(tipo, dto);
    return this.tipoVehiculoRepo.save(tipo);
  }

  async removeTipoVehiculo(id: string) {
    const tipo = await this.tipoVehiculoRepo.findOneBy({ id });
    if (!tipo) throw new NotFoundException(`El tipo de vehículo con ID ${id} no existe`);
    await this.tipoVehiculoRepo.delete(id);
    return { message: `El tipo de vehículo "${tipo.nombre}" fue eliminado correctamente`, id };
  }

  // --- Tarifas ---

  findAllTarifas(): Promise<Tarifa[]> {
    return this.tarifaRepo.find({
      relations: { zona: true, tipoVehiculo: true },
      order: { vigenteDesde: 'DESC' },
    });
  }

  createTarifa(dto: CreateTarifaDto): Promise<Tarifa> {
    const { zonaId, tipoVehiculoId, valor, ...rest } = dto;
    return this.tarifaRepo.save(
      this.tarifaRepo.create({
        ...rest,
        valor: valor.toFixed(2),
        zona: { id: zonaId } as Zona,
        tipoVehiculo: { id: tipoVehiculoId } as TipoVehiculo,
      }),
    );
  }

  async updateTarifa(id: string, dto: UpdateTarifaDto): Promise<Tarifa> {
    const tarifa = await this.tarifaRepo.findOne({
      where: { id },
      relations: { zona: true, tipoVehiculo: true },
    });
    if (!tarifa) throw new NotFoundException(`La tarifa con ID ${id} no existe`);

    const { zonaId, tipoVehiculoId, valor, ...rest } = dto;
    Object.assign(tarifa, rest);
    if (valor !== undefined) tarifa.valor = valor.toFixed(2);
    if (zonaId) tarifa.zona = { id: zonaId } as Zona;
    if (tipoVehiculoId) tarifa.tipoVehiculo = { id: tipoVehiculoId } as TipoVehiculo;

    return this.tarifaRepo.save(tarifa);
  }

  async removeTarifa(id: string) {
    const tarifa = await this.tarifaRepo.findOneBy({ id });
    if (!tarifa) throw new NotFoundException(`La tarifa con ID ${id} no existe`);
    await this.tarifaRepo.delete(id);
    return { message: 'La tarifa fue eliminada correctamente', id };
  }

  // --- Instrumentos ---

  findAllInstrumentos(): Promise<Instrumento[]> {
    return this.instrumentoRepo.find({ order: { nombre: 'ASC' } });
  }

  createInstrumento(dto: CreateInstrumentoDto): Promise<Instrumento> {
    return this.instrumentoRepo.save(this.instrumentoRepo.create(dto));
  }

  async updateInstrumento(id: string, dto: UpdateInstrumentoDto): Promise<Instrumento> {
    const instrumento = await this.instrumentoRepo.findOneBy({ id });
    if (!instrumento) throw new NotFoundException(`El instrumento con ID ${id} no existe`);
    Object.assign(instrumento, dto);
    return this.instrumentoRepo.save(instrumento);
  }

  async removeInstrumento(id: string) {
    const instrumento = await this.instrumentoRepo.findOneBy({ id });
    if (!instrumento) throw new NotFoundException(`El instrumento con ID ${id} no existe`);
    await this.instrumentoRepo.delete(id);
    return { message: `El instrumento "${instrumento.nombre}" fue eliminado correctamente`, id };
  }

  // --- Agrupaciones ---

  findAllAgrupaciones(): Promise<Agrupacion[]> {
    return this.agrupacionRepo.find({ relations: { ruta: true }, order: { nombre: 'ASC' } });
  }

  createAgrupacion(dto: CreateAgrupacionDto): Promise<Agrupacion> {
    const { rutaId, ...rest } = dto;
    return this.agrupacionRepo.save(
      this.agrupacionRepo.create({ ...rest, ruta: rutaId ? ({ id: rutaId } as Ruta) : null }),
    );
  }

  async updateAgrupacion(id: string, dto: UpdateAgrupacionDto): Promise<Agrupacion> {
    const agrupacion = await this.agrupacionRepo.findOneBy({ id });
    if (!agrupacion) throw new NotFoundException(`La agrupación con ID ${id} no existe`);

    const { rutaId, ...rest } = dto;
    Object.assign(agrupacion, rest);
    if (rutaId !== undefined) agrupacion.ruta = rutaId ? ({ id: rutaId } as Ruta) : null;

    return this.agrupacionRepo.save(agrupacion);
  }

  async removeAgrupacion(id: string) {
    const agrupacion = await this.agrupacionRepo.findOneBy({ id });
    if (!agrupacion) throw new NotFoundException(`La agrupación con ID ${id} no existe`);
    await this.agrupacionRepo.delete(id);
    return { message: `La agrupación "${agrupacion.nombre}" fue eliminada correctamente`, id };
  }
}
