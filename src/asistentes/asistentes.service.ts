// asistentes.service.ts
import {
  BadRequestException, ConflictException, Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Asistente, TipoAsistente } from './entities/asistente.entity';
import { Evento } from '../eventos/entities/evento.entity';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { EquipoInterno } from '../equipo-interno/entities/equipo-interno.entity';
import { InscribirAsistenteDto } from './dto/create-asistente.dto';
import { VerificarDocumentoResponseDto } from './dto/verificar-documento.dto';
import * as QRCode from 'qrcode';
import { MarcarIngresoDto } from './dto/marcar-ingreso.dto';

export interface PersonaDelGrupo {
  nombreCompleto: string;
  documento: string;
  ingresado?: boolean;
}

export type IngresoConGrupo = Omit<Asistente, 'titular' | 'acompanantes'> & {
  titular: PersonaDelGrupo | null;
  acompanantes: PersonaDelGrupo[];
};

@Injectable()
export class AsistentesService {
  constructor(
    @InjectRepository(Asistente)
    private readonly asistenteRepo: Repository<Asistente>,
    @InjectRepository(Evento)
    private readonly eventoRepo: Repository<Evento>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(EquipoInterno)
    private readonly equipoRepo: Repository<EquipoInterno>,
  ) {}

  async inscribir(dto: InscribirAsistenteDto): Promise<{ asistente: Asistente; qrImagen: string }> {
    
    const evento = await this.eventoRepo.findOneBy({ id: dto.eventoId });
    if (evento?.usaFormularioRed) {
  throw new BadRequestException('Este evento usa el formulario de inscripción por red.');
}
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
    } else if (!nombreCompleto) {
      // Ya registrado en el sistema (equipo interno o inscrito a otro evento):
      // el formulario solo pide la comuna y los datos se toman de aquí.
      const conocido = documento ? await this.datosConocidos(documento) : null;
      if (!conocido) {
        throw new BadRequestException(
          'documento, nombreCompleto y email son requeridos para asistentes RED o EXTERNO.',
        );
      }
      nombreCompleto = conocido.nombreCompleto;
      email = email || conocido.email || undefined;
      telefono = telefono || conocido.telefono || undefined;
    } else if (!documento || !email) {
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
      comuna: dto.comuna?.trim() || null,
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

  // Sin sesión, el documento es de facto público (lo puede escribir cualquiera
  // en el formulario de inscripción): por eso esta consulta no debe devolver
  // nombre, correo ni teléfono de alguien que solo "adivinó" el documento
  // ajeno (mismo patrón de IDOR ya corregido en transportes). Solo se
  // devuelve lo que el formulario necesita para prellenarse o para recuperar
  // el propio QR si ya estaba inscrito.
  async verificarDocumento(documento: string, eventoId?: string): Promise<VerificarDocumentoResponseDto> {
    if (eventoId) {
      const yaInscrito = await this.asistenteRepo.findOne({
        where: { documento, evento: { id: eventoId } },
      });
      if (yaInscrito) {
        // Preinscrito de escuela que todavía no confirmó: aún no tiene QR.
        const qrImagen = yaInscrito.qrToken
          ? await QRCode.toDataURL(yaInscrito.qrToken, { errorCorrectionLevel: 'M', width: 300 })
          : undefined;
        return {
          encontrado: true,
          yaInscrito: true,
          asistenteId: yaInscrito.id,
          tipo: yaInscrito.tipo,
          qrImagen,
        };
      }
    }

    const estudiante = await this.estudianteRepo.findOneBy({ documento });
    if (estudiante) {
      return {
        encontrado: true,
        tipo: TipoAsistente.ESTUDIANTE,
        estudianteId: estudiante.id,
      };
    }

    const equipo = await this.equipoRepo.findOneBy({ documento, activo: true });
    if (equipo) {
      return { encontrado: true, tipo: TipoAsistente.RED };
    }

    const asistentePrevio = await this.asistenteRepo.findOne({
      where: { documento, qrToken: Not(IsNull()) },
      order: { fechaInscripcion: 'DESC' },
    });
    if (asistentePrevio) {
      return {
        encontrado: true,
        tipo: asistentePrevio.tipo,
      };
    }

    return { encontrado: false };
  }

  // Datos de alguien que ya está en el sistema, para no volver a pedírselos.
  private async datosConocidos(
    documento: string,
  ): Promise<{ nombreCompleto: string; email: string | null; telefono: string | null } | null> {
    const equipo = await this.equipoRepo.findOneBy({ documento, activo: true });
    if (equipo) return equipo;
    const previo = await this.asistenteRepo.findOne({
      where: { documento, qrToken: Not(IsNull()) },
      order: { fechaInscripcion: 'DESC' },
    });
    return previo ?? null;
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
      relations: { estudiante: true, evento: true, titular: true },
    });
    if (!asistente) throw new NotFoundException('El código QR no corresponde a ninguna inscripción.');
    return asistente;
  }

  /** Idempotente: si ya estaba ingresado, no falla, solo devuelve el estado actual. */
 // asistentes.service.ts
async marcarIngreso(dto: MarcarIngresoDto): Promise<IngresoConGrupo> {
  const asistente = dto.qrToken
    ? await this.findByQrToken(dto.qrToken)
    : await this.findByDocumentoYEvento(dto.documento!, dto.eventoId!);

  // Sin QR no hay boleta: preinscrito de escuela que no completó su inscripción,
  // o estudiante de agrupación (entra como músico; solo sus acompañantes tienen boleta).
  if (!asistente.qrToken) {
    throw new BadRequestException(
      asistente.modalidad === 'AGRUPACION'
        ? 'Es músico de agrupación: no tiene boleta de público. Solo sus acompañantes ingresan con QR.'
        : 'Fue preseleccionado por su escuela pero no completó la inscripción.',
    );
  }

  const confirmado = await this.confirmarIngreso(
    asistente, dto.fechaIngreso ? new Date(dto.fechaIngreso) : undefined,
  );
  return this.conGrupo(confirmado);
}

// Agrega a la respuesta del ingreso quién viene con esta persona, para que el
// escáner muestre al titular y sus acompañantes. Para cualquier inscripción
// normal titular es null y acompanantes [], así que la respuesta solo crece.
// Se proyectan campos mínimos: nunca el qrToken de los acompañantes.
private async conGrupo(asistente: Asistente): Promise<IngresoConGrupo> {
  const acompanantes = await this.asistenteRepo.find({
    where: { titular: { id: asistente.id } },
    select: { id: true, nombreCompleto: true, documento: true, ingresado: true },
    order: { fechaInscripcion: 'ASC' },
  });
  const { titular, ...resto } = asistente;
  return {
    ...resto,
    titular: titular ? { nombreCompleto: titular.nombreCompleto, documento: titular.documento } : null,
    acompanantes: acompanantes.map((a) => ({
      nombreCompleto: a.nombreCompleto, documento: a.documento, ingresado: a.ingresado,
    })),
  };
}

async findByDocumentoYEvento(documento: string, eventoId: string): Promise<Asistente> {
  const asistente = await this.asistenteRepo.findOne({
    where: { documento, evento: { id: eventoId } },
    relations: { estudiante: true, evento: true, titular: true },
  });
  if (!asistente) {
    throw new NotFoundException('No se encontró una inscripción con ese documento para este evento.');
  }
  return asistente
}

// Lógica compartida entre ambos caminos — idempotente, igual que antes
private async confirmarIngreso(asistente: Asistente, fechaIngreso?: Date): Promise<Asistente> {
  if (asistente.ingresado) {
    return asistente; // ya había entrado, no es error, solo se informa el estado actual
  }
  asistente.ingresado = true;
  asistente.fechaIngreso = fechaIngreso ?? new Date();
  return this.asistenteRepo.save(asistente);
}

// Proyección liviana para el padrón que el escáner descarga para operar sin
// conexión: nada de email/teléfono/datos de red, y solo quienes tienen QR
// asignado (sin QR no hay nada que escanear offline).
async findPadronOfflinePorEvento(eventoId: string): Promise<Pick<Asistente, 'id' | 'documento' | 'nombreCompleto' | 'qrToken' | 'tipo' | 'ingresado' | 'fechaIngreso'>[]> {
  return this.asistenteRepo.find({
    where: { evento: { id: eventoId }, qrToken: Not(IsNull()) },
    select: { id: true, documento: true, nombreCompleto: true, qrToken: true, tipo: true, ingresado: true, fechaIngreso: true },
    order: { fechaInscripcion: 'ASC' },
  });
}

  async remove(id: string): Promise<{ mensaje: string }> {
    const asistente = await this.findOne(id);
    await this.asistenteRepo.remove(asistente);
    return { mensaje: 'Inscripción eliminada correctamente' };
  }
}