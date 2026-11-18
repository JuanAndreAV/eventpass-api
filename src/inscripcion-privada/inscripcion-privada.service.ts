import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { TipoDocumento } from '../common/entity/persona-base.entity';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
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
  AcompananteDto,
} from './dto/create-inscripcion-privada.dto';
import { TipoEvento } from '../eventos/entities/evento.entity';

export interface EntradaView {
  nombre: string;
  documento: string;
  rol: 'TITULAR' | 'ACOMPANANTE';
  qrImagen: string;
}

export interface InscripcionPrivadaView {
  id: string;
  nombre: string;
  documento: string;
  correo: string | null;
  modalidad: 'ESCUELA' | 'AGRUPACION';
  escuela: string | null;
  cantidadBoletas: number;
  evento: { nombre: string; lugar: string; fechaInicio: Date };
  // Un QR por persona: titular primero, luego sus acompañantes
  entradas: EntradaView[];
}


// Techo técnico de acompañantes por estudiante; coincide con @ArrayMaxSize del DTO
const MAX_ACOMPANANTES_TECNICO = 50;

// ---------- Plantilla de preinscritos (Excel del director) ----------
const COLUMNAS_PLANTILLA = [
  'Tipo de documento', 'Número de documento', 'Nombres', 'Apellidos', 'Correo', 'Teléfono',
  'Cantidad de acompañantes',
];
const TIPOS_DOCUMENTO_PLANTILLA = ['CC', 'TI', 'RC', 'CE', 'PASAPORTE', 'NUIP', 'PPT'];
const TIPO_DOC_PLANTILLA: Record<string, string> = {
  CC: 'CC', 'CEDULA DE CIUDADANIA': 'CC',
  TI: 'TI', 'TARJETA DE IDENTIDAD': 'TI',
  RC: 'RC', RCN: 'RC', 'REGISTRO CIVIL': 'RC',
  CE: 'CE', 'CEDULA DE EXTRANJERIA': 'CE',
  PP: 'PASAPORTE', PAS: 'PASAPORTE', PASAPORTE: 'PASAPORTE',
  NUIP: 'NUIP', PPT: 'PPT',
};
const norm = (v: unknown): string =>
  String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');

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

  // ---------- Escuelas ----------
  // Los estudiantes ya fueron preinscritos por la organización (Excel del director,
  // ver importarPreinscritos). Aquí el estudiante solo se identifica con su documento.

  async consultarEscuela(token: string, documento: string) {
    const cfg = await this.configPorToken(token);
    if (!cfg.escuelasHabilitadas) {
      throw new BadRequestException('La inscripción de escuelas no está habilitada.');
    }

    const pre = await this.asistenteRepo.findOne({
      where: { evento: { id: cfg.evento.id }, documento: documento.trim(), modalidad: 'ESCUELA', titular: IsNull() },
      relations: { escuelaRel: true },
    });
    if (!pre || !pre.escuelaRel) return { encontrado: false };

    return {
      encontrado: true,
      yaInscrito: !!pre.qrToken,
      nombre: enmascarar(pre.nombreCompleto),
      escuela: pre.escuelaRel.nombre,
      // Boletas que el director le asignó en el Excel: la suya + sus acompañantes
      boletasAsignadas: pre.cantidadBoletas,
      maxAcompanantes: Math.max(0, pre.cantidadBoletas - 1),
    };
  }

  async inscribirEscuela(token: string, dto: InscribirEscuelaDto): Promise<InscripcionPrivadaView> {
    const cfg = await this.configPorToken(token);
    if (!cfg.escuelasHabilitadas) {
      throw new BadRequestException('La inscripción de escuelas no está habilitada.');
    }

    const eventoId = cfg.evento.id;
    const documento = dto.documento.trim();
    this.validarAcompanantes(documento, dto.acompanantes);

    let titular: Asistente;
    let acompanantes: Asistente[] = [];
    try {
      [titular, acompanantes] = await this.dataSource.transaction(async (m: EntityManager) => {
        // Bloquea la fila del preinscrito: si el mismo estudiante envía dos veces a la
        // vez, la segunda espera y ve que ya tiene QR.
        // (FOR UPDATE no se puede combinar con el LEFT JOIN de la escuela, por eso
        // primero se bloquea la fila sola y luego se carga la relación.)
        const bloqueado = await m.findOne(Asistente, {
          where: { evento: { id: eventoId }, documento, modalidad: 'ESCUELA', titular: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        const pre = bloqueado
          ? await m.findOne(Asistente, { where: { id: bloqueado.id }, relations: { escuelaRel: true } })
          : null;
        if (!pre || !pre.escuelaRel) {
          throw new NotFoundException(
            'Tu documento no está en la lista enviada por tu escuela. Comunícate con el director de tu escuela.',
          );
        }
        if (pre.qrToken) {
          throw new ConflictException(
            'Ya completaste tu inscripción. Si perdiste tu QR, comunícate con la organización.',
          );
        }

        // Las boletas ya quedaron reservadas al cargar el Excel (pre.cantidadBoletas).
        // El estudiante puede registrar hasta las que le asignó el director.
        const max = Math.max(0, pre.cantidadBoletas - 1);
        if (dto.acompanantes.length > max) {
          throw new BadRequestException(
            max === 0
              ? 'Tu escuela no te asignó acompañantes. Si necesitas, comunícate con el director.'
              : `Tu escuela te asignó máximo ${max} acompañante${max === 1 ? '' : 's'}.`,
          );
        }
        await this.verificarDocumentosLibres(m, eventoId, dto.acompanantes);

        // Si registra menos de los asignados, las boletas que sobran vuelven a la escuela
        // (el director puede asignarlas a otro estudiante en un nuevo Excel).
        const usadasReales = 1 + dto.acompanantes.length;
        const sobrantes = pre.cantidadBoletas - usadasReales;
        if (sobrantes > 0) {
          await m
            .createQueryBuilder()
            .update(EventoCupoEscuela)
            .set({ usadas: () => 'GREATEST(usadas - :sobrantes, 0)' })
            .where('evento_id = :eventoId AND escuela_id = :escuelaId')
            .setParameters({ sobrantes, eventoId, escuelaId: pre.escuelaRel.id })
            .execute();
          pre.cantidadBoletas = usadasReales;
        }

        pre.email = dto.correo.trim();
        pre.comuna = dto.comuna.trim();
        pre.qrToken = randomUUID();
        const t = await m.save(pre);
        const acs = await this.crearAcompanantes(m, t, eventoId, dto.acompanantes);
        return [t, acs] as [Asistente, Asistente[]];
      });
    } catch (error: unknown) {
      throw this.traducirDuplicado(error);
    }

    return this.aVista(titular, acompanantes, cfg.evento, titular.escuelaRel?.nombre ?? null);
  }

  // ---------- Agrupaciones integradas ----------

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
      // Lógica fija: el participante usa una boleta y registra a los demás (hoy, su acudiente)
      acompanantes: Math.max(0, cfg.boletasPorParticipante - 1),
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

    const esperados = Math.max(0, cfg.boletasPorParticipante - 1);
    if (dto.acompanantes.length !== esperados) {
      throw new BadRequestException(
        `Debes registrar ${esperados} acompañante${esperados === 1 ? '' : 's'}.`,
      );
    }
    this.validarAcompanantes(estudiante.documento, dto.acompanantes);

    let titular: Asistente;
    let acompanantes: Asistente[] = [];
    try {
      [titular, acompanantes] = await this.dataSource.transaction(async (m: EntityManager) => {
        if (await m.exists(Asistente, { where: { evento: { id: cfg.evento.id }, documento: estudiante.documento } })) {
          throw new ConflictException('Ya existe una inscripción con ese documento para este evento.');
        }
        await this.verificarDocumentosLibres(m, cfg.evento.id, dto.acompanantes);

        const t = await m.save(
          m.create(Asistente, {
            evento: { id: cfg.evento.id } as Evento,
            tipo: TipoAsistente.ESTUDIANTE,
            estudiante,
            modalidad: 'AGRUPACION',
            nombreCompleto: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
            documento: estudiante.documento,
            email: dto.correo?.trim() || estudiante.email || null,
            telefono: estudiante.telefono ?? null,
            comuna: dto.comuna.trim(),
            cantidadBoletas: 1,
            boletasIngresadas: 0,
            qrToken: randomUUID(),
            ingresado: false,
          }),
        );
        const acs = await this.crearAcompanantes(m, t, cfg.evento.id, dto.acompanantes);
        return [t, acs] as [Asistente, Asistente[]];
      });
    } catch (error: unknown) {
      throw this.traducirDuplicado(error);
    }

    return this.aVista(titular, acompanantes, cfg.evento, null);
  }

  private agrupacionesActivas(estudianteId: string): Promise<EstudianteAgrupacion[]> {
    return this.estAgrRepo.find({
      where: { estudianteId, activo: true, agrupacion: { activa: true } },
      relations: { agrupacion: true },
    });
  }

  // ---------- Acompañantes (compartido) ----------


  // Sin repetidos dentro del mismo formulario ni el documento del propio titular
  private validarAcompanantes(documentoTitular: string, acompanantes: AcompananteDto[]): void {
    const vistos = new Set<string>([documentoTitular.trim().toUpperCase()]);
    for (const a of acompanantes) {
      const doc = a.documento.trim().toUpperCase();
      if (vistos.has(doc)) {
        throw new BadRequestException(`El documento ${a.documento.trim()} está repetido en el formulario.`);
      }
      vistos.add(doc);
    }
  }

  // Mensaje claro antes de que el índice único (documento, evento) lo rechace
  private async verificarDocumentosLibres(m: EntityManager, eventoId: string, acompanantes: AcompananteDto[]) {
    if (acompanantes.length === 0) return;
    const ocupado = await m.findOne(Asistente, {
      where: { evento: { id: eventoId }, documento: In(acompanantes.map((a) => a.documento.trim())) },
      select: { id: true, documento: true },
    });
    if (ocupado) {
      throw new ConflictException(`El documento ${ocupado.documento} ya está inscrito en este evento.`);
    }
  }

  private async crearAcompanantes(
    m: EntityManager, titular: Asistente, eventoId: string, acompanantes: AcompananteDto[],
  ): Promise<Asistente[]> {
    if (acompanantes.length === 0) return [];
    return m.save(
      acompanantes.map((a) =>
        m.create(Asistente, {
          evento: { id: eventoId } as Evento,
          titular: { id: titular.id } as Asistente,
          tipo: TipoAsistente.EXTERNO,
          modalidad: titular.modalidad,
          escuelaRel: titular.escuelaRel ? ({ id: titular.escuelaRel.id } as Escuela) : null,
          escuela: titular.escuela ?? null,
          nombreCompleto: a.nombre.trim(),
          documento: a.documento.trim(),
          comuna: a.comuna.trim(),
          cantidadBoletas: 1,
          boletasIngresadas: 0,
          qrToken: randomUUID(),
          ingresado: false,
        }),
      ),
    );
  }

  private traducirDuplicado(error: unknown): unknown {
    if ((error as { code?: string }).code === '23505') {
      return new ConflictException('Uno de los documentos ya está inscrito en este evento.');
    }
    return error;
  }

  private async aVista(
    titular: Asistente, acompanantes: Asistente[], evento: Evento, escuela: string | null,
  ): Promise<InscripcionPrivadaView> {
    const qr = (token: string) => QRCode.toDataURL(token, { errorCorrectionLevel: 'M', width: 300 });
    return {
      id: titular.id,
      nombre: titular.nombreCompleto,
      documento: titular.documento,
      correo: titular.email ?? null,
      modalidad: titular.modalidad as 'ESCUELA' | 'AGRUPACION',
      escuela,
      cantidadBoletas: 1 + acompanantes.length,
      evento: { nombre: evento.nombre, lugar: evento.lugar, fechaInicio: evento.fechaInicio },
      entradas: await Promise.all([
        qr(titular.qrToken).then((qrImagen) => ({
          nombre: titular.nombreCompleto, documento: titular.documento, rol: 'TITULAR' as const, qrImagen,
        })),
        ...acompanantes.map((a) =>
          qr(a.qrToken).then((qrImagen) => ({
            nombre: a.nombreCompleto, documento: a.documento, rol: 'ACOMPANANTE' as const, qrImagen,
          })),
        ),
      ]),
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
    // Solo inscripciones confirmadas (con QR): los preinscritos de escuela que no han
    // completado su inscripción no son boletas todavía. Cada fila es una persona.
    const totales = await this.asistenteRepo
      .createQueryBuilder('a')
      .select('a.modalidad', 'modalidad')
      .addSelect('COUNT(*) FILTER (WHERE a.titular_id IS NULL)', 'inscripciones')
      .addSelect('COUNT(*)', 'boletas')
      .addSelect('COUNT(*) FILTER (WHERE a.ingresado)', 'ingresadas')
      .where('a.evento_id = :eventoId AND a.qrToken IS NOT NULL', { eventoId })
      .groupBy('a.modalidad')
      .getRawMany<{ modalidad: string | null; inscripciones: string; boletas: string; ingresadas: string }>();

    // Preinscritos por escuela: cargados desde el Excel y cuántos ya confirmaron
    const pre = await this.asistenteRepo
      .createQueryBuilder('a')
      .select('a.escuela_id', 'escuelaId')
      .addSelect('COUNT(*)', 'preinscritos')
      .addSelect('COUNT(*) FILTER (WHERE a.qrToken IS NOT NULL)', 'confirmados')
      .where("a.evento_id = :eventoId AND a.modalidad = 'ESCUELA' AND a.titular_id IS NULL", { eventoId })
      .groupBy('a.escuela_id')
      .getRawMany<{ escuelaId: string; preinscritos: string; confirmados: string }>();
    const prePorEscuela = new Map(pre.map((p) => [p.escuelaId, p]));

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
          preinscritos: Number(prePorEscuela.get(c.escuela.id)?.preinscritos ?? 0),
          confirmados: Number(prePorEscuela.get(c.escuela.id)?.confirmados ?? 0),
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
    // usadas = boletas ya asignadas por el Excel del director (estudiantes + acompañantes)
    if (cupo < fila.usadas) {
      throw new ConflictException(`No puedes bajar el cupo a menos de ${fila.usadas}: esas boletas ya están asignadas.`);
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

  // ============================================================
  // PREINSCRITOS DE ESCUELAS (Excel del director)
  // ============================================================

  // Plantilla que se envía a cada director para que relacione a sus estudiantes.
  async plantillaEscuela(eventoId: string, escuelaId: string): Promise<{ archivo: Buffer; nombre: string }> {
    const cfg = await this.cfgPorEvento(eventoId);
    const escuela = await this.escuelaRepo.findOneBy({ id: escuelaId });
    if (!escuela) throw new NotFoundException('Escuela no encontrada');
    const cupo = await this.cupoRepo.findOne({ where: { evento: { id: eventoId }, escuela: { id: escuelaId } } });
    const boletas = cupo?.cupo ?? cfg.cupoPorEscuelaDefecto;
    const tope = cfg.topeBoletasPorPersona;

    const wb = XLSX.utils.book_new();
    const hoja = XLSX.utils.aoa_to_sheet([COLUMNAS_PLANTILLA]);
    hoja['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 32 }, { wch: 16 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, hoja, 'Estudiantes');

    const instrucciones = XLSX.utils.aoa_to_sheet([
      [cfg.evento.nombre],
      [`Escuela: ${escuela.nombre}`],
      [`Boletas de la escuela: ${boletas}. Cada estudiante usa una y cada acompañante otra.`],
      [`La suma de estudiantes + acompañantes de este archivo no puede pasar de ${boletas}.`],
      [tope === null
        ? 'No hay tope por persona: el director decide cuántos acompañantes asigna a cada estudiante.'
        : `Tope por persona: ${tope} boletas (el estudiante y hasta ${tope - 1} acompañantes).`],
      [],
      ['Instrucciones'],
      ['1. Relacione en la hoja "Estudiantes" a los estudiantes seleccionados, uno por fila, sin cambiar los encabezados.'],
      [`2. Tipo de documento: ${TIPOS_DOCUMENTO_PLANTILLA.join(', ')}.`],
      ['3. El número de documento va sin puntos ni espacios. Es con el que el estudiante completará su inscripción.'],
      ['   Si un documento empieza por 0, escríbalo con un apóstrofo al inicio (por ejemplo \'0123456) para que Excel no borre el cero.'],
      ['4. En "Cantidad de acompañantes" escriba cuántos acompañantes le asigna a cada estudiante (0 si viene solo).'],
      ['5. Cada estudiante completa su inscripción con su documento en el enlace del evento y allí registra el nombre y documento de sus acompañantes.'],
    ]);
    instrucciones['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, instrucciones, 'Instrucciones');

    const archivo = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const slug = norm(escuela.nombre).replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return { archivo, nombre: `preinscritos-${slug}.xlsx` };
  }

  // dryRun (por defecto): valida y devuelve el reporte sin guardar nada.
  async importarPreinscritos(eventoId: string, escuelaId: string, buffer: Buffer, dryRun: boolean) {
    const escuela = await this.escuelaRepo.findOneBy({ id: escuelaId });
    if (!escuela) throw new NotFoundException('Escuela no encontrada');

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('No se pudo leer el archivo. Debe ser un Excel (.xlsx).');
    }
    const nombreHoja = wb.SheetNames.find((n) => norm(n) === 'ESTUDIANTES') ?? wb.SheetNames[0];
    if (!nombreHoja) throw new BadRequestException('El Excel no tiene hojas.');
    const filas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nombreHoja], { header: 1, defval: '' });

    // Fila de encabezados: la primera que tenga una columna de documento
    const idxEnc = filas.findIndex((f) => f.some((c) => /DOCUMENTO/.test(norm(c)) && !/TIPO/.test(norm(c))));
    if (idxEnc < 0) {
      throw new BadRequestException('No se encontró la columna "Número de documento". Usa la plantilla sin cambiar los encabezados.');
    }
    const enc = filas[idxEnc].map(norm);
    const col = (pred: (h: string) => boolean) => enc.findIndex(pred);
    const iTipo = col((h) => h.includes('TIPO'));
    const iDoc = col((h) => h.includes('DOCUMENTO') && !h.includes('TIPO'));
    const iNom = col((h) => h.startsWith('NOMBRE'));
    const iApe = col((h) => h.startsWith('APELLIDO'));
    const iCorreo = col((h) => h.includes('CORREO') || h.includes('EMAIL'));
    const iTel = col((h) => h.includes('TELEFONO') || h.includes('CELULAR'));
    const iAcomp = col((h) => h.includes('ACOMPA'));
    if (iAcomp < 0) {
      throw new BadRequestException('Falta la columna "Cantidad de acompañantes". Usa la plantilla sin cambiar los encabezados.');
    }
    const cfg = await this.cfgPorEvento(eventoId);
    if (iNom < 0 || iApe < 0) {
      throw new BadRequestException('Faltan las columnas "Nombres" y/o "Apellidos". Usa la plantilla sin cambiar los encabezados.');
    }

    const celda = (f: unknown[], i: number) => (i < 0 ? '' : String(f[i] ?? '').trim());
    const errores: { fila: number; documento: string; motivo: string }[] = [];
    const validas: { fila: number; tipoDocumento: TipoDocumento | null; documento: string; nombreCompleto: string; email: string | null; telefono: string | null; boletas: number }[] = [];
    const vistos = new Set<string>();
    let leidas = 0;

    filas.slice(idxEnc + 1).forEach((f, i) => {
      const fila = idxEnc + i + 2; // número de fila real en Excel
      if (f.every((c) => String(c ?? '').trim() === '')) return; // fila vacía
      leidas++;
      const documento = celda(f, iDoc).replace(/[.\s-]/g, '');
      const nombres = celda(f, iNom);
      const apellidos = celda(f, iApe);
      const correo = celda(f, iCorreo);
      const tipoRaw = norm(celda(f, iTipo));

      if (!/^[A-Za-z0-9]{4,20}$/.test(documento)) {
        errores.push({ fila, documento, motivo: 'Documento vacío o no válido (solo letras y números, 4 a 20).' });
        return;
      }
      if (!nombres || !apellidos) {
        errores.push({ fila, documento, motivo: 'Faltan nombres o apellidos.' });
        return;
      }
      if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errores.push({ fila, documento, motivo: `Correo no válido: ${correo}` });
        return;
      }
      const acompRaw = celda(f, iAcomp);
      const acompanantes = acompRaw === '' ? 0 : Number(acompRaw);
      if (!Number.isInteger(acompanantes) || acompanantes < 0 || acompanantes > MAX_ACOMPANANTES_TECNICO) {
        errores.push({ fila, documento, motivo: `Cantidad de acompañantes no válida: "${acompRaw}" (número entero, 0 si viene solo).` });
        return;
      }
      if (cfg.topeBoletasPorPersona !== null && 1 + acompanantes > cfg.topeBoletasPorPersona) {
        errores.push({ fila, documento, motivo: `Supera el tope por persona: máximo ${cfg.topeBoletasPorPersona - 1} acompañantes.` });
        return;
      }
      const clave = documento.toUpperCase();
      if (vistos.has(clave)) {
        errores.push({ fila, documento, motivo: 'Documento repetido en el archivo.' });
        return;
      }
      vistos.add(clave);
      validas.push({
        fila,
        tipoDocumento: (TIPO_DOC_PLANTILLA[tipoRaw] as TipoDocumento) ?? null,
        documento,
        nombreCompleto: `${nombres} ${apellidos}`.replace(/\s+/g, ' ').slice(0, 255),
        email: correo ? correo.slice(0, 150) : null,
        telefono: celda(f, iTel).replace(/[^\d+]/g, '').slice(0, 20) || null,
        boletas: 1 + acompanantes,
      });
    });

    // Ya inscritos en el evento (en esta u otra escuela, agrupación o como acompañante)
    const existentes = validas.length
      ? await this.asistenteRepo.find({
          where: { evento: { id: eventoId }, documento: In(validas.map((v) => v.documento)) },
          relations: { escuelaRel: true },
          select: { id: true, documento: true, modalidad: true, escuelaRel: { id: true, nombre: true } },
        })
      : [];
    const porDoc = new Map(existentes.map((e) => [e.documento, e]));
    const nuevas = validas.filter((v) => {
      const e = porDoc.get(v.documento);
      if (!e) return true;
      errores.push({
        fila: v.fila,
        documento: v.documento,
        motivo: e.escuelaRel?.id === escuelaId
          ? 'Ya estaba cargado en esta escuela (se omite).'
          : `Ya está inscrito en el evento${e.escuelaRel ? ` por ${e.escuelaRel.nombre}` : ''}.`,
      });
      return false;
    });
    errores.sort((a, b) => a.fila - b.fila);

    const yaCargados = await this.asistenteRepo.count({
      where: { evento: { id: eventoId }, modalidad: 'ESCUELA', titular: IsNull(), escuelaRel: { id: escuelaId } },
    });
    const cupoFila = await this.cupoRepo.findOne({ where: { evento: { id: eventoId }, escuela: { id: escuelaId } } });
    if (!cupoFila) throw new BadRequestException('Esta escuela no tiene cupo en el evento. Usa "Agregar escuelas faltantes".');
    const boletasNuevas = nuevas.reduce((t, v) => t + v.boletas, 0);
    const boletasTrasCarga = cupoFila.usadas + boletasNuevas;
    const excedeCupo = boletasTrasCarga > cupoFila.cupo;
    if (!dryRun && excedeCupo) {
      throw new ConflictException(
        `La escuela tiene ${cupoFila.cupo} boletas y quedarían ${boletasTrasCarga} asignadas. Ajusta el Excel o aumenta el cupo.`,
      );
    }

    if (!dryRun && nuevas.length > 0) {
      const estudiantes = await this.estudianteRepo.find({
        where: { documento: In(nuevas.map((v) => v.documento)) },
        select: { id: true, documento: true },
      });
      const estPorDoc = new Map(estudiantes.map((e) => [e.documento, e]));
      try {
        await this.dataSource.transaction(async (m) => {
          // Reserva atómica de las boletas asignadas por el director
          const r = await m
            .createQueryBuilder()
            .update(EventoCupoEscuela)
            .set({ usadas: () => 'usadas + :n' })
            .where('evento_id = :eventoId AND escuela_id = :escuelaId AND usadas + :n <= cupo')
            .setParameters({ n: boletasNuevas, eventoId, escuelaId })
            .execute();
          if (!r.affected) {
            throw new ConflictException('El cupo de la escuela cambió mientras se cargaba. Vuelve a revisar el archivo.');
          }
          await m.save(
            nuevas.map((v) => {
              const est = estPorDoc.get(v.documento);
              return m.create(Asistente, {
                evento: { id: eventoId } as Evento,
                tipo: est ? TipoAsistente.ESTUDIANTE : TipoAsistente.EXTERNO,
                estudiante: est ? ({ id: est.id } as Estudiante) : undefined,
                modalidad: 'ESCUELA',
                escuelaRel: { id: escuelaId } as Escuela,
                escuela: escuela.nombre,
                tipoDocumento: v.tipoDocumento,
                documento: v.documento,
                nombreCompleto: v.nombreCompleto,
                email: v.email,
                telefono: v.telefono,
                // Boletas asignadas por el director: la suya + acompañantes
                cantidadBoletas: v.boletas,
                boletasIngresadas: 0,
                // Sin QR hasta que el estudiante complete su inscripción: así no aparece
                // en el padrón del escáner ni puede marcar ingreso.
                qrToken: null as unknown as string,
                ingresado: false,
              });
            }),
            { chunk: 200 },
          );
        });
      } catch (error: unknown) {
        throw this.traducirDuplicado(error);
      }
    }

    return {
      dryRun,
      escuela: escuela.nombre,
      filasLeidas: leidas,
      aCargar: nuevas.length,
      cargados: dryRun ? 0 : nuevas.length,
      yaCargadosAntes: yaCargados,
      totalTrasCarga: yaCargados + nuevas.length,
      boletasACargar: boletasNuevas,
      boletasAsignadasAntes: cupoFila.usadas,
      boletasTrasCarga,
      cupo: cupoFila.cupo,
      excedeCupo,
      errores,
      muestra: nuevas.slice(0, 10).map((v) => ({ fila: v.fila, documento: v.documento, nombre: v.nombreCompleto, boletas: v.boletas })),
    };
  }

  async listarPreinscritos(eventoId: string, escuelaId: string) {
    await this.cfgPorEvento(eventoId);
    const filas = await this.asistenteRepo
      .createQueryBuilder('a')
      .leftJoin('a.acompanantes', 'ac')
      .select(['a.id AS id', 'a.nombreCompleto AS nombre', 'a.documento AS documento', 'a.email AS correo'])
      .addSelect('(a.qrToken IS NOT NULL)', 'confirmado')
      .addSelect('a.ingresado', 'ingresado')
      .addSelect('a.cantidadBoletas', 'boletas')
      .addSelect('COUNT(ac.id)', 'acompanantes')
      .where('a.evento_id = :eventoId AND a.escuela_id = :escuelaId', { eventoId, escuelaId })
      .andWhere("a.modalidad = 'ESCUELA' AND a.titular_id IS NULL")
      .groupBy('a.id')
      .orderBy('a.nombreCompleto', 'ASC')
      .getRawMany<{ id: string; nombre: string; documento: string; correo: string | null; confirmado: boolean; ingresado: boolean; boletas: number; acompanantes: string }>();
    return filas.map((f) => ({ ...f, boletas: Number(f.boletas), acompanantes: Number(f.acompanantes) }));
  }

  // Solo se puede quitar a quien no ha confirmado; sus boletas reservadas vuelven a la escuela.
  async eliminarPreinscrito(asistenteId: string) {
    const a = await this.asistenteRepo.findOne({
      where: { id: asistenteId }, relations: { evento: true, escuelaRel: true },
    });
    if (!a || a.modalidad !== 'ESCUELA' || a.titular) throw new NotFoundException('Preinscrito no encontrado');
    if (a.qrToken) {
      throw new ConflictException('Este estudiante ya completó su inscripción; no se puede quitar desde aquí.');
    }
    await this.dataSource.transaction(async (m) => {
      await m.delete(Asistente, a.id);
      if (a.escuelaRel) {
        await m
          .createQueryBuilder()
          .update(EventoCupoEscuela)
          .set({ usadas: () => 'GREATEST(usadas - :n, 0)' })
          .where('evento_id = :eventoId AND escuela_id = :escuelaId')
          .setParameters({ n: a.cantidadBoletas, eventoId: a.evento.id, escuelaId: a.escuelaRel.id })
          .execute();
      }
    });
    return { mensaje: `${a.nombreCompleto} se quitó de la lista y sus ${a.cantidadBoletas} boleta(s) volvieron a la escuela.` };
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