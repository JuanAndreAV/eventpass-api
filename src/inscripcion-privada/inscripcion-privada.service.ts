import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Asistente, TipoAsistente } from '../asistentes/entities/asistente.entity';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { Evento } from '../eventos/entities/evento.entity';
// AJUSTA la ruta a donde viven tus entidades de agrupaciones
import { EstudianteAgrupacion } from '../agrupacion-integrada/entities/estudiante-agrupacion.entity';
import { EventoCupoEscuela } from './entities/evento-cupo-escuela.entity';
import { EventoInscripcionPrivada } from './entities/inscripcion-privada.entity';
import {
  CrearEventoPrivadoDto, ActualizarCupoDto, ActualizarTodosCuposDto,
  ActualizarConfiguracionDto, CrearConfiguracionDto, InscribirAgrupacionDto, InscribirEscuelaDto,
} from './dto/create-inscripcion-privada.dto';
import { TipoEvento } from '../eventos/entities/evento.entity';

export interface InscripcionPrivadaView {
  id: string;
  nombre: string;
  documento: string;
  correo: string | null;
  modalidad: 'ESCUELA' | 'AGRUPACION';
  escuela: string | null;
  cantidadBoletas: number;
  evento: { nombre: string; lugar: string; fechaInicio: Date };
  qrImagen: string;
}

// "JUAN PEREZ GOMEZ" -> "J*** P***** G****": confirma identidad sin filtrar el nombre completo
const enmascarar = (nombre: string): string =>
  nombre
    .trim()
    .split(/\s+/)
    .map((p) => (p.length <= 1 ? p : p[0] + '*'.repeat(Math.min(p.length - 1, 6))))
    .join(' ');

@Injectable()
export class InscripcionPrivadaService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EventoInscripcionPrivada) private readonly cfgRepo: Repository<EventoInscripcionPrivada>,
    @InjectRepository(EventoCupoEscuela) private readonly cupoRepo: Repository<EventoCupoEscuela>,
    @InjectRepository(Asistente) private readonly asistenteRepo: Repository<Asistente>,
    @InjectRepository(Evento) private readonly eventoRepo: Repository<Evento>,
    @InjectRepository(Escuela) private readonly escuelaRepo: Repository<Escuela>,
    @InjectRepository(Estudiante) private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(EstudianteAgrupacion) private readonly estAgrRepo: Repository<EstudianteAgrupacion>,
  ) {}

  // ============================================================
  // PÚBLICO (se llega con el token del enlace)
  // ============================================================

  // Un solo mensaje para token inexistente o desactivado: no se filtra cuál de los dos es.
  private async configPorToken(token: string): Promise<EventoInscripcionPrivada> {
    const cfg = await this.cfgRepo.findOne({ where: { token }, relations: { evento: true } });
    if (!cfg || !cfg.activa) throw new NotFoundException('Este enlace no es válido.');
    if (!cfg.evento.activo) throw new BadRequestException('La inscripción no está abierta.');
    return cfg;
  }

  async info(token: string) {
    const cfg = await this.configPorToken(token);
    return {
      evento: { nombre: cfg.evento.nombre, lugar: cfg.evento.lugar, fechaInicio: cfg.evento.fechaInicio },
      escuelasHabilitadas: cfg.escuelasHabilitadas,
      agrupacionesHabilitadas: cfg.agrupacionesHabilitadas,
      topeBoletasPorPersona: cfg.topeBoletasPorPersona,
    };
  }

  async escuelasDisponibles(token: string) {
    const cfg = await this.configPorToken(token);
    const cupos = await this.cupoRepo.find({
      where: { evento: { id: cfg.evento.id } },
      relations: { escuela: true },
    });
    return cupos
      .filter((c) => c.escuela.activa)
      .map((c) => ({
        escuelaId: c.escuela.id,
        nombre: c.escuela.nombre,
        disponibles: Math.max(0, c.cupo - c.usadas),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async inscribirEscuela(token: string, dto: InscribirEscuelaDto): Promise<InscripcionPrivadaView> {
    const cfg = await this.configPorToken(token);
    if (!cfg.escuelasHabilitadas) {
      throw new BadRequestException('La inscripción de escuelas no está habilitada.');
    }

    const n = dto.cantidadBoletas;
    if (cfg.topeBoletasPorPersona !== null && n > cfg.topeBoletasPorPersona) {
      throw new BadRequestException(`Máximo ${cfg.topeBoletasPorPersona} boletas por persona.`);
    }

    const eventoId = cfg.evento.id;
    const documento = dto.documento.trim();

    let guardado: Asistente;
    let nombreEscuela = '';
    try {
      guardado = await this.dataSource.transaction(async (m: EntityManager) => {
        // 1) Documento repetido: mensaje claro antes de tocar el cupo
        if (await m.exists(Asistente, { where: { evento: { id: eventoId }, documento } })) {
          throw new ConflictException('Ya existe una inscripción con ese documento para este evento.');
        }

        // 2) Cupo atómico: el UPDATE solo aplica si caben las n boletas. Si dos personas
        //    llegan a la vez, la fila se bloquea y la segunda ve el cupo ya descontado.
        const r = await m
          .createQueryBuilder()
          .update(EventoCupoEscuela)
          .set({ usadas: () => 'usadas + :n' })
          .where('evento_id = :eventoId AND escuela_id = :escuelaId AND usadas + :n <= cupo')
          .setParameters({ n, eventoId, escuelaId: dto.escuelaId })
          .execute();

        if (!r.affected) {
          const cupo = await m.findOne(EventoCupoEscuela, {
            where: { evento: { id: eventoId }, escuela: { id: dto.escuelaId } },
          });
          if (!cupo) throw new BadRequestException('Esa escuela no participa en esta inscripción.');
          const quedan = Math.max(0, cupo.cupo - cupo.usadas);
          throw new ConflictException(
            quedan === 0
              ? 'Ya se agotaron las boletas de esta escuela.'
              : `Solo quedan ${quedan} boletas disponibles para esta escuela.`,
          );
        }

        const escuela = await m.findOneByOrFail(Escuela, { id: dto.escuelaId });
        nombreEscuela = escuela.nombre;

        // 3) La inscripción. Si esto falla, la transacción deshace también el descuento del cupo.
        const asistente = m.create(Asistente, {
          evento: { id: eventoId } as Evento,
          tipo: TipoAsistente.EXTERNO,
          modalidad: 'ESCUELA',
          escuelaRel: { id: escuela.id } as Escuela,
          escuela: escuela.nombre,
          nombreCompleto: dto.nombre.trim(),
          documento,
          email: dto.correo.trim(),
          cantidadBoletas: n,
          boletasIngresadas: 0,
          qrToken: randomUUID(),
          ingresado: false,
        });
        return m.save(asistente);
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe una inscripción con ese documento para este evento.');
      }
      throw error;
    }

    return this.aVista(guardado, cfg.evento, nombreEscuela);
  }

  // Paso 1 del formulario de agrupaciones: confirmar que el documento participa.
  // No devuelve el QR de una inscripción existente (son menores y el documento lo puede
  // escribir cualquiera): quien ya se inscribió debe pedir ayuda a la organización.
  async consultarAgrupacion(token: string, documento: string) {
    const cfg = await this.configPorToken(token);
    if (!cfg.agrupacionesHabilitadas) {
      throw new BadRequestException('La inscripción de agrupaciones integradas no está habilitada.');
    }

    const estudiante = await this.estudianteRepo.findOneBy({ documento: documento.trim() });
    const relaciones = estudiante ? await this.agrupacionesActivas(estudiante.id) : [];
    if (!estudiante || relaciones.length === 0) return { encontrado: false };

    const yaInscrito = await this.asistenteRepo.exists({
      where: { evento: { id: cfg.evento.id }, documento: estudiante.documento },
    });

    return {
      encontrado: true,
      yaInscrito,
      nombre: enmascarar(`${estudiante.nombres} ${estudiante.apellidos}`),
      agrupaciones: relaciones.map((r) => r.agrupacion.nombre),
      boletas: cfg.boletasPorParticipante,
      // Punto de extensión: aquí van el acudiente y los dos invitados, cuando se definan
      // dónde están esos datos (enmascarados, igual que el nombre).
    };
  }

  async inscribirAgrupacion(token: string, dto: InscribirAgrupacionDto): Promise<InscripcionPrivadaView> {
    const cfg = await this.configPorToken(token);
    if (!cfg.agrupacionesHabilitadas) {
      throw new BadRequestException('La inscripción de agrupaciones integradas no está habilitada.');
    }

    const estudiante = await this.estudianteRepo.findOneBy({ documento: dto.documento.trim() });
    const relaciones = estudiante ? await this.agrupacionesActivas(estudiante.id) : [];
    if (!estudiante || relaciones.length === 0) {
      throw new NotFoundException('No encontramos ese documento en las agrupaciones integradas.');
    }

    let guardado: Asistente;
    try {
      guardado = await this.dataSource.transaction(async (m: EntityManager) => {
        if (await m.exists(Asistente, { where: { evento: { id: cfg.evento.id }, documento: estudiante.documento } })) {
          throw new ConflictException('Ya existe una inscripción con ese documento para este evento.');
        }
        const asistente = m.create(Asistente, {
          evento: { id: cfg.evento.id } as Evento,
          tipo: TipoAsistente.ESTUDIANTE,
          estudiante,
          modalidad: 'AGRUPACION',
          nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
          documento: estudiante.documento,
          email: estudiante.email ?? null,
          telefono: estudiante.telefono ?? null,
          cantidadBoletas: cfg.boletasPorParticipante,
          boletasIngresadas: 0,
          qrToken: randomUUID(),
          ingresado: false,
        });
        return m.save(asistente);
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe una inscripción con ese documento para este evento.');
      }
      throw error;
    }

    return this.aVista(guardado, cfg.evento, null);
  }

  private agrupacionesActivas(estudianteId: string): Promise<EstudianteAgrupacion[]> {
    return this.estAgrRepo.find({
      where: { estudianteId, activo: true, agrupacion: { activa: true } },
      relations: { agrupacion: true },
    });
  }

  private async aVista(a: Asistente, evento: Evento, escuela: string | null): Promise<InscripcionPrivadaView> {
    return {
      id: a.id,
      nombre: a.nombreCompleto,
      documento: a.documento,
      correo: a.email ?? null,
      modalidad: a.modalidad as 'ESCUELA' | 'AGRUPACION',
      escuela,
      cantidadBoletas: a.cantidadBoletas,
      evento: { nombre: evento.nombre, lugar: evento.lugar, fechaInicio: evento.fechaInicio },
      qrImagen: await QRCode.toDataURL(a.qrToken, { errorCorrectionLevel: 'M', width: 300 }),
    };
  }

  // ============================================================
  // ADMINISTRACIÓN (solo con sesión de administrador)
  // ============================================================
async listar() {
  const configs = await this.cfgRepo.find({
    relations: { evento: true },
    order: { creadoEn: 'DESC' },
  });
  return configs.map((c) => ({
    eventoId: c.evento.id,
    nombre: c.evento.nombre,
    lugar: c.evento.lugar,
    fechaInicio: c.evento.fechaInicio,
    eventoActivo: c.evento.activo,
    activa: c.activa,
    escuelasHabilitadas: c.escuelasHabilitadas,
    agrupacionesHabilitadas: c.agrupacionesHabilitadas,
  }));
}

// Crea el evento, su configuración y un cupo por escuela activa en UNA transacción.
// El evento nace oculto (visible = false) y sin formulario público: nunca llega a verse.
async crearEventoPrivado(dto: CrearEventoPrivadoDto) {
  const { nombre, lugar, fechaInicio, descripcion, ...config } = dto;

  const eventoId = await this.dataSource.transaction(async (m: EntityManager) => {
    const evento = await m.save(
      m.create(Evento, {
        nombre: nombre.trim(),
        lugar: lugar.trim(),
        descripcion,
        fechaInicio: new Date(fechaInicio),
        tipo: TipoEvento.CONCIERTO,
        activo: true,
        visible: false,
        usaFormularioRed: false,
      }),
    );

    const cfg = await m.save(
      m.create(EventoInscripcionPrivada, {
        evento: { id: evento.id } as Evento,
        token: this.nuevoToken(),
        ...config,
        topeBoletasPorPersona: config.topeBoletasPorPersona ?? null,
      }),
    );

    const escuelas = await m.find(Escuela, { where: { activa: true }, select: { id: true } });
    if (escuelas.length > 0) {
      await m.insert(
        EventoCupoEscuela,
        escuelas.map((e) => ({
          evento: { id: evento.id } as Evento,
          escuela: { id: e.id } as Escuela,
          cupo: cfg.cupoPorEscuelaDefecto,
          usadas: 0,
        })),
      );
    }
    return evento.id;
  });

  return this.resumen(eventoId);
}

// Mismo cupo para todas las escuelas. Las que ya tienen más boletas tomadas que el nuevo
// cupo se omiten (no se puede bajar de lo ya reservado); se informa cuántas.
async actualizarTodosLosCupos(eventoId: string, cupo: number) {
  await this.cfgPorEvento(eventoId);
  const r = await this.cupoRepo
    .createQueryBuilder()
    .update(EventoCupoEscuela)
    .set({ cupo })
    .where('evento_id = :eventoId AND usadas <= :cupo', { eventoId, cupo })
    .execute();
  const total = await this.cupoRepo.count({ where: { evento: { id: eventoId } } });
  const actualizadas = r.affected ?? 0;
  return { actualizadas, omitidas: total - actualizadas };
}

// Agrega el cupo por defecto a las escuelas activas que todavía no tienen fila
// (por ejemplo, una escuela creada después de configurar el evento).
async sincronizarCupos(eventoId: string) {
  const cfg = await this.cfgPorEvento(eventoId);
  const existentes = await this.cupoRepo.find({
    where: { evento: { id: eventoId } },
    relations: { escuela: true },
  });
  const ya = new Set(existentes.map((c) => c.escuela.id));
  const activas = await this.escuelaRepo.find({ where: { activa: true }, select: { id: true } });
  const faltan = activas.filter((e) => !ya.has(e.id));
  if (faltan.length > 0) {
    await this.cupoRepo.insert(
      faltan.map((e) => ({
        evento: { id: eventoId } as Evento,
        escuela: { id: e.id } as Escuela,
        cupo: cfg.cupoPorEscuelaDefecto,
        usadas: 0,
      })),
    );
  }
  return { agregadas: faltan.length };
}

  async crearConfiguracion(eventoId: string, dto: CrearConfiguracionDto) {
    const evento = await this.eventoRepo.findOneBy({ id: eventoId });
    if (!evento) throw new NotFoundException(`El evento con ID ${eventoId} no existe`);
    if (await this.cfgRepo.exists({ where: { evento: { id: eventoId } } })) {
      throw new ConflictException('Este evento ya tiene inscripción privada configurada.');
    }

    const cfg = await this.cfgRepo.save(
      this.cfgRepo.create({
        evento: { id: eventoId } as Evento,
        token: this.nuevoToken(),
        ...dto,
        topeBoletasPorPersona: dto.topeBoletasPorPersona ?? null,
      }),
    );

    // Un cupo por cada escuela activa, con el valor por defecto
    const escuelas = await this.escuelaRepo.find({ where: { activa: true }, select: { id: true } });
    if (escuelas.length > 0) {
      await this.cupoRepo.insert(
        escuelas.map((e) => ({
          evento: { id: eventoId } as Evento,
          escuela: { id: e.id } as Escuela,
          cupo: cfg.cupoPorEscuelaDefecto,
          usadas: 0,
        })),
      );
    }
    return this.resumen(eventoId);
  }

  async resumen(eventoId: string) {
    const cfg = await this.cfgPorEvento(eventoId);
    const cupos = await this.cupoRepo.find({
      where: { evento: { id: eventoId } },
      relations: { escuela: true },
    });
    const totales = await this.asistenteRepo
      .createQueryBuilder('a')
      .select('a.modalidad', 'modalidad')
      .addSelect('COUNT(*)', 'inscripciones')
      .addSelect('COALESCE(SUM(a.cantidadBoletas), 0)', 'boletas')
      .addSelect('COALESCE(SUM(a.boletasIngresadas), 0)', 'ingresadas')
      .where('a.evento_id = :eventoId', { eventoId })
      .groupBy('a.modalidad')
      .getRawMany<{ modalidad: string | null; inscripciones: string; boletas: string; ingresadas: string }>();

    return {
        evento: { id: cfg.evento.id, nombre: cfg.evento.nombre, lugar: cfg.evento.lugar,
 fechaInicio: cfg.evento.fechaInicio, activo: cfg.evento.activo },
      token: cfg.token,
      activa: cfg.activa,
      escuelasHabilitadas: cfg.escuelasHabilitadas,
      agrupacionesHabilitadas: cfg.agrupacionesHabilitadas,
      cupoPorEscuelaDefecto: cfg.cupoPorEscuelaDefecto,
      topeBoletasPorPersona: cfg.topeBoletasPorPersona,
      boletasPorParticipante: cfg.boletasPorParticipante,
      cupos: cupos
        .map((c) => ({
          id: c.id,
          escuelaId: c.escuela.id,
          escuela: c.escuela.nombre,
          cupo: c.cupo,
          usadas: c.usadas,
          disponibles: c.cupo - c.usadas,
        }))
        .sort((a, b) => a.escuela.localeCompare(b.escuela, 'es')),
      totales: totales.map((t) => ({
        modalidad: t.modalidad,
        inscripciones: Number(t.inscripciones),
        boletas: Number(t.boletas),
        ingresadas: Number(t.ingresadas),
      })),
    };
  }

  async actualizarConfiguracion(eventoId: string, dto: ActualizarConfiguracionDto) {
    const cfg = await this.cfgPorEvento(eventoId);
    Object.assign(cfg, dto);
    await this.cfgRepo.save(cfg);
    return this.resumen(eventoId);
  }

  async actualizarCupo(cupoId: string, cupo: number) {
    const fila = await this.cupoRepo.findOneBy({ id: cupoId });
    if (!fila) throw new NotFoundException('Cupo no encontrado');
    if (cupo < fila.usadas) {
      throw new ConflictException(`No puedes bajar el cupo de ${fila.usadas} porque ya hay ${fila.usadas} boletas tomadas.`);
    }
    fila.cupo = cupo;
    await this.cupoRepo.save(fila);
    return { id: fila.id, cupo: fila.cupo, usadas: fila.usadas, disponibles: fila.cupo - fila.usadas };
  }

  // Invalida el enlace anterior (por ejemplo si se filtró)
  async regenerarToken(eventoId: string) {
    const cfg = await this.cfgPorEvento(eventoId);
    cfg.token = this.nuevoToken();
    await this.cfgRepo.save(cfg);
    return { token: cfg.token };
  }

  private async cfgPorEvento(eventoId: string): Promise<EventoInscripcionPrivada> {
    const cfg = await this.cfgRepo.findOne({ where: { evento: { id: eventoId } },
    
    relations: { evento: true } });
    if (!cfg) throw new NotFoundException('Este evento no tiene inscripción privada configurada.');
    return cfg;
  }

  private nuevoToken(): string {
    return randomBytes(24).toString('base64url'); // 32 caracteres, imposible de adivinar
  }
}