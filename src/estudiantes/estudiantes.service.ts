// estudiantes.service.ts
import {
  ConflictException, Injectable, InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Estudiante } from './entities/estudiante.entity';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto';
import {
  IdentificarEstudianteDto, MetodoIdentificacion,
} from './dto/identificar-estudiante.dto';

@Injectable()
export class EstudiantesService {
  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>,
    @InjectRepository(Escuela)
    private readonly escuelaRepository: Repository<Escuela>,
  ) {}

  async create(dto: CreateEstudianteDto): Promise<Estudiante> {
    const { escuelaId, usuarioId, qrTokenMaster, ...datos } = dto;

    const escuela = await this.escuelaRepository.findOneBy({ id: escuelaId });
    if (!escuela) {
      throw new NotFoundException(`La escuela con el ID "${escuelaId}" no existe.`);
    }

    const nuevoEstudiante = this.estudianteRepository.create({
      ...datos,
      escuela,
      // Si no viene un qrTokenMaster explícito, generamos uno único automáticamente
      qrTokenMaster: qrTokenMaster ?? randomUUID(),
      usuario: usuarioId ? ({ id: usuarioId } as any) : undefined,
    });

    try {
      return await this.estudianteRepository.save(nuevoEstudiante);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(escuelaId?: string): Promise<Estudiante[]> {
    return this.estudianteRepository.find({
      where: escuelaId ? { escuela: { id: escuelaId } } : {},
      relations: { escuela: true },
      order: { apellidos: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Estudiante> {
    const estudiante = await this.estudianteRepository.findOne({
      where: { id },
      relations: { escuela: true, usuario: true },
    });
    if (!estudiante) throw new NotFoundException(`El estudiante con ID ${id} no existe`);
    return estudiante;
  }

  /**
   * Núcleo del caso de uso principal: el vigilante escanea NFC/QR o digita el documento
   * y el sistema debe encontrar al estudiante y devolver su foto para verificación visual.
   */
  async identificar(dto: IdentificarEstudianteDto): Promise<Estudiante> {
    const where =
      dto.metodo === MetodoIdentificacion.NFC ? { nfcUid: dto.valor } :
      dto.metodo === MetodoIdentificacion.QR ? { qrTokenMaster: dto.valor } :
      { documento: dto.valor };

    const estudiante = await this.estudianteRepository.findOne({
      where,
      relations: { escuela: true },
    });

    if (!estudiante) {
      throw new NotFoundException(
        `No se encontró ningún estudiante con ese ${dto.metodo.toLowerCase()}.`,
      );
    }

    return estudiante;
  }

  async update(id: string, dto: UpdateEstudianteDto): Promise<Estudiante> {
    const { usuarioId, ...datos } = dto;
    const estudiante = await this.findOne(id);

    Object.assign(estudiante, datos);

    if (usuarioId !== undefined) {
      estudiante.usuario = usuarioId ? ({ id: usuarioId } as any) : undefined;
    }

    try {
      return await this.estudianteRepository.save(estudiante);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async cambiarEscuela(id: string, escuelaId: string): Promise<Estudiante> {
    const estudiante = await this.findOne(id);
    const escuela = await this.escuelaRepository.findOneBy({ id: escuelaId });
    if (!escuela) throw new NotFoundException(`La escuela con ID ${escuelaId} no existe`);

    estudiante.escuela = escuela;
    return this.estudianteRepository.save(estudiante);
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const estudiante = await this.findOne(id);
    await this.estudianteRepository.remove(estudiante);
    return { mensaje: `Estudiante "${estudiante.nombres} ${estudiante.apellidos}" eliminado` };
  }

  private handleDBExceptions(error: any): never {
    if (error.code === '23505') {
      const detail: string = error.detail || '';
      if (detail.includes('documento')) {
        throw new ConflictException('El número de documento ya está registrado.');
      }
      if (detail.includes('nfcUid')) {
        throw new ConflictException('Esa tarjeta NFC ya pertenece a otro estudiante.');
      }
      if (detail.includes('qrTokenMaster')) {
        throw new ConflictException('Ese token QR ya pertenece a otro estudiante.');
      }
      throw new ConflictException('Ya existe un registro con esos datos únicos.');
    }
    console.error('Error no controlado en estudiantes:', error);
    throw new InternalServerErrorException('Ocurrió un error inesperado.');
  }
}