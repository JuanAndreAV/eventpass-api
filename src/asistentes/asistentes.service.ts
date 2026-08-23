// asistentes.service.ts
import {
  BadRequestException, ConflictException, Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Asistente, TipoAsistente } from './entities/asistente.entity';
import { Evento } from '../eventos/entities/evento.entity';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { InscribirAsistenteDto } from './dto/create-asistente.dto';

@Injectable()
export class AsistentesService {
  constructor(
    @InjectRepository(Asistente)
    private readonly asistenteRepo: Repository<Asistente>,
    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
  ) {}

  async inscribir(dto: InscribirAsistenteDto): Promise<Asistente> {
    const evento = await this.eventoRepo.findOneBy({ id: dto.eventoId });
    if (!evento) throw new NotFoundException(`El evento con ID ${dto.eventoId} no existe`);

    // Validar cupo si el evento tiene aforo máximo definido
    if (evento.aforoMaximo) {
      const inscritos = await this.asistenteRepo.count({ where: { evento: { id: evento.id } } });
      if (inscritos >= evento.aforoMaximo) {
        throw new BadRequestException('El evento ya alcanzó su aforo máximo.');
      }
    }

    let estudiante: Estudiante | undefined;
    let documento = dto.documento;
    let nombreCompleto = dto.nombreCompleto;
    let email = dto.email;

    if (dto.tipo === TipoAsistente.ESTUDIANTE) {
      if (!dto.estudianteId) {
        throw new BadRequestException('estudianteId es requerido cuando tipo es ESTUDIANTE.');
      }
      const encontrado = await this.estudianteRepo.findOneBy({ id: dto.estudianteId });
      if (!encontrado) throw new NotFoundException(`El estudiante con ID ${dto.estudianteId} no existe`);

      estudiante = encontrado;
      // Se copian del estudiante para no depender de que el cliente los reenvíe
      documento = encontrado.documento;
      nombreCompleto = `${encontrado.nombres} ${encontrado.apellidos}`;
      email = encontrado.email;
    } else if (!documento || !nombreCompleto || !email) {
      throw new BadRequestException(
        'documento, nombreCompleto y email son requeridos para asistentes RED o EXTERNO.',
      );
    }

    const nuevoAsistente = this.asistenteRepo.create({
      evento,
      estudiante,
      tipo: dto.tipo,
      documento,
      nombreCompleto,
      email,
      telefono: dto.telefono,
      qrToken: randomUUID(),
      ingresado: false,
    });

    try {
      return await this.asistenteRepo.save(nuevoAsistente);
    } catch (error) {
      if (error instanceof Object && 'code' in error && error.code === '23505') {
        throw new ConflictException('Este documento ya está inscrito en este evento.');
      }
      throw error;
    }
  }

  findByEvento(eventoId: string): Promise<Asistente[]> {
    return this.asistenteRepo.find({
      where: { evento: { id: eventoId } },
      relations: { estudiante: true },
      order: { fechaInscripcion: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Asistente> {
    const asistente = await this.asistenteRepo.findOne({
      where: { id },
      relations: { estudiante: true, evento: true },
    });
    if (!asistente) throw new NotFoundException(`El asistente con ID ${id} no existe`);
    return asistente;
  }

  async findByQrToken(qrToken: string): Promise<Asistente> {
    const asistente = await this.asistenteRepo.findOne({
      where: { qrToken },
      relations: { estudiante: true, evento: true },
    });
    if (!asistente) throw new NotFoundException('El código QR no corresponde a ninguna inscripción.');
    return asistente;
  }

  /** Marca el ingreso físico al evento (usado por el vigilante al escanear el QR de inscripción) */
  async marcarIngreso(qrToken: string): Promise<Asistente> {
    const asistente = await this.findByQrToken(qrToken);

    if (asistente.ingresado) {
      throw new ConflictException(
        `Este asistente ya registró su ingreso el ${asistente.fechaIngreso?.toLocaleString()}.`,
      );
    }

    asistente.ingresado = true;
    asistente.fechaIngreso = new Date();
    return this.asistenteRepo.save(asistente);
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const asistente = await this.findOne(id);
    await this.asistenteRepo.remove(asistente);
    return { mensaje: 'Inscripción eliminada correctamente' };
  }
}