import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAgrupacionIntegradaDto } from './dto/create-agrupacion-integrada.dto';
import { UpdateAgrupacionIntegradaDto } from './dto/update-agrupacion-integrada.dto';
import { AgrupacionIntegrada } from './entities/agrupacion-integrada.entity';

@Injectable()
export class AgrupacionIntegradaService {
  constructor(
    @InjectRepository(AgrupacionIntegrada)
    private readonly agrupacionRepository: Repository<AgrupacionIntegrada>,
  ) {}

  create(createAgrupacionIntegradaDto: CreateAgrupacionIntegradaDto) {
    return 'This action adds a new agrupacionIntegrada';
  }

  // Lista con el número de integrantes activos de cada agrupación
  async findAll() {
    const filas = await this.agrupacionRepository
      .createQueryBuilder('a')
      .leftJoin('a.estudiantesRelacion', 'ea', 'ea.activo = true')
      .select(['a.id AS id', 'a.nombre AS nombre', 'a.descripcion AS descripcion', 'a.activa AS activa'])
      .addSelect('COUNT(ea.id)::int', 'totalIntegrantes')
      .groupBy('a.id')
      .orderBy('a.nombre', 'ASC')
      .getRawMany<{ id: string; nombre: string; descripcion: string | null; activa: boolean; totalIntegrantes: number }>();
    return filas.map((f) => ({ ...f, totalIntegrantes: Number(f.totalIntegrantes) }));
  }

  async findOne(id: string) {
    const agrupacion = await this.agrupacionRepository.findOneBy({ id });
    if (!agrupacion) throw new NotFoundException(`La agrupación con ID ${id} no existe`);
    return agrupacion;
  }

  update(id: string, updateAgrupacionIntegradaDto: UpdateAgrupacionIntegradaDto) {
    return `This action updates a #${id} agrupacionIntegrada`;
  }

  remove(id: string) {
    return `This action removes a #${id} agrupacionIntegrada`;
  }
}
