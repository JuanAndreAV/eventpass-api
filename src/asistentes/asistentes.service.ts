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
import { VerificarDocumentoResponseDto } from './dto/verificar-documento.dto';
import * as QRCode from 'qrcode';
import { MarcarIngresoDto } from './dto/marcar-ingreso.dto';

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

  async inscribir(dto: InscribirAsistenteDto): Promise<{ asistente: Asistente; qrImagen: string }> {
    const evento = await this.eventoRepo.findOneBy({ id: dto.eventoId });
    if (!evento) throw new NotFoundException(`El evento con ID ${dto.eventoId} no existe`);

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
    let telefono = dto.telefono;

    if (dto.tipo === TipoAsistente.ESTUDIANTE) {
      if (!dto.estudianteId) {
        throw new BadRequestException('estudianteId es requerido cuando tipo es ESTUDIANTE.');
      }
      const encontrado = await this.estudianteRepo.findOneBy({ id: dto.estudianteId });
      if (!encontrado) throw new NotFoundException(`El estudiante con ID ${dto.estudianteId} no existe`);

      estudiante = encontrado;
      documento = encontrado.documento;
      nombreCompleto = `${encontrado.nombres} ${encontrado.apellidos}`;
      email = encontrado.email;
      telefono = encontrado.telefono;
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
      telefono,
      qrToken: randomUUID(), // 👈 simple, sin firma
      ingresado: false,
    });

    let guardado: Asistente;
    try {
      guardado = await this.asistenteRepo.save(nuevoAsistente);
    } catch (error: unknown) {
      const anyErr = error as { code?: string };
      if (anyErr.code === '23505') {
        throw new ConflictException('Este documento ya está inscrito en este evento.');
      }
      throw error;
    }

    const qrImagen = await QRCode.toDataURL(guardado.qrToken, { errorCorrectionLevel: 'M', width: 300 });

    return { asistente: guardado, qrImagen };
  }

  async verificarDocumento(documento: string, eventoId?: string): Promise<VerificarDocumentoResponseDto> {
    if (eventoId) {
      const yaInscrito = await this.asistenteRepo.findOne({
        where: { documento, evento: { id: eventoId } },
      });
      if (yaInscrito) {
        return {
          encontrado: true,
          yaInscrito: true,
          asistenteId: yaInscrito.id,
          tipo: yaInscrito.tipo,
          nombreCompleto: yaInscrito.nombreCompleto,
          email: yaInscrito.email,
          telefono: yaInscrito.telefono,
        };
      }
    }

    const estudiante = await this.estudianteRepo.findOneBy({ documento });
    if (estudiante) {
      return {
        encontrado: true,
        tipo: TipoAsistente.ESTUDIANTE,
        estudianteId: estudiante.id,
        nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`,
        email: estudiante.email,
        telefono: estudiante.telefono,
      };
    }

    const asistentePrevio = await this.asistenteRepo.findOne({
      where: { documento },
      order: { fechaInscripcion: 'DESC' },
    });
    if (asistentePrevio) {
      return {
        encontrado: true,
        tipo: asistentePrevio.tipo,
        nombreCompleto: asistentePrevio.nombreCompleto,
        email: asistentePrevio.email,
        telefono: asistentePrevio.telefono,
      };
    }

    return { encontrado: false };
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

  /** Idempotente: si ya estaba ingresado, no falla, solo devuelve el estado actual. */
 // asistentes.service.ts
async marcarIngreso(dto: MarcarIngresoDto): Promise<Asistente> {
  const asistente = dto.qrToken
    ? await this.findByQrToken(dto.qrToken)
    : await this.findByDocumentoYEvento(dto.documento!, dto.eventoId!);

  return this.confirmarIngreso(asistente);
}

async findByDocumentoYEvento(documento: string, eventoId: string): Promise<Asistente> {
  const asistente = await this.asistenteRepo.findOne({
    where: { documento, evento: { id: eventoId } },
    relations: { estudiante: true, evento: true },
  });
  if (!asistente) {
    throw new NotFoundException('No se encontró una inscripción con ese documento para este evento.');
  }
  return asistente;
}

// Lógica compartida entre ambos caminos — idempotente, igual que antes
private async confirmarIngreso(asistente: Asistente): Promise<Asistente> {
  if (asistente.ingresado) {
    return asistente; // ya había entrado, no es error, solo se informa el estado actual
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