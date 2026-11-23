// estudiantes.service.ts
import {
  ConflictException, Injectable, InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Estudiante } from './entities/estudiante.entity';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { EstudianteAgrupacion } from '../agrupacion-integrada/entities/estudiante-agrupacion.entity';
import { EquipoAsignacion } from '../equipo-interno/entities/equipo_asignacion.entity';
import { Asistente } from '../asistentes/entities/asistente.entity';
import { ListarEstudiantesDto } from './dto/listar-estudiantes.dto';
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
    @InjectRepository(EstudianteAgrupacion)
    private readonly estAgrRepository: Repository<EstudianteAgrupacion>,
    @InjectRepository(EquipoAsignacion)
    private readonly asignacionRepository: Repository<EquipoAsignacion>,
    @InjectRepository(Asistente)
    private readonly asistenteRepository: Repository<Asistente>,
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

  // ---------- Gestión de estudiantes (panel admin) ----------

  async listarGestion(filtros: ListarEstudiantesDto) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 25;

    const qb = this.estudianteRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.escuela', 'esc')
      .orderBy('e.apellidos', 'ASC')
      .addOrderBy('e.nombres', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const texto = filtros.q?.trim();
    if (texto) {
      qb.andWhere(
        new Brackets((w) => {
          w.where(`(e.nombres || ' ' || e.apellidos) ILIKE :texto`, { texto: `%${texto}%` })
            .orWhere('e.documento ILIKE :doc', { doc: `${texto}%` });
        }),
      );
    }

    if (filtros.escuelaId) {
      qb.andWhere('esc.id = :escuelaId', { escuelaId: filtros.escuelaId });
    }

    // Solo cuentan las membresías activas
    const existeMembresia = `EXISTS (
      SELECT 1 FROM estudiantes_agrupacion ea
      WHERE ea.estudiante_id = e.id AND ea.activo = true
      %s
    )`;
    if (filtros.agrupacionId) {
      qb.andWhere(existeMembresia.replace('%s', 'AND ea.agrupacion_id = :agrupacionId'), {
        agrupacionId: filtros.agrupacionId,
      });
    } else if (filtros.enAgrupacion === 'con') {
      qb.andWhere(existeMembresia.replace('%s', ''));
    } else if (filtros.enAgrupacion === 'sin') {
      qb.andWhere(`NOT ${existeMembresia.replace('%s', '')}`);
    }

    const [estudiantes, total] = await qb.getManyAndCount();

    const ids = estudiantes.map((e) => e.id);
    const membresias = ids.length
      ? await this.estAgrRepository.find({
          where: { estudianteId: In(ids), activo: true },
          relations: { agrupacion: true },
        })
      : [];

    const porEstudiante = new Map<string, { id: string; nombre: string }[]>();
    for (const m of membresias) {
      const lista = porEstudiante.get(m.estudianteId) ?? [];
      lista.push({ id: m.agrupacion.id, nombre: m.agrupacion.nombre });
      porEstudiante.set(m.estudianteId, lista);
    }

    return {
      items: estudiantes.map((e) => ({
        ...this.aVistaGestion(e),
        agrupaciones: porEstudiante.get(e.id) ?? [],
      })),
      total,
      page,
      limit,
    };
  }

  async detalle(id: string) {
    const estudiante = await this.findOne(id);

    // Todas las membresías (también las inactivas, para ver el historial)
    const membresias = await this.estAgrRepository.find({
      where: { estudianteId: id },
      relations: { agrupacion: true },
      order: { activo: 'DESC', creadoEn: 'ASC' },
    });
    const agrupacionIds = membresias.map((m) => m.agrupacionId);

    const [integrantes, equipo, totalInscripciones, equipoEscuela] = await Promise.all([
      agrupacionIds.length
        ? this.estAgrRepository
            .createQueryBuilder('ea')
            .select('ea.agrupacion_id', 'agrupacionId')
            .addSelect('COUNT(*)::int', 'total')
            .where('ea.agrupacion_id IN (:...agrupacionIds)', { agrupacionIds })
            .andWhere('ea.activo = true')
            .groupBy('ea.agrupacion_id')
            .getRawMany<{ agrupacionId: string; total: number }>()
        : Promise.resolve([]),
      agrupacionIds.length
        ? this.asignacionRepository.find({
            where: { agrupacion: { id: In(agrupacionIds) }, activo: true, persona: { activo: true } },
            relations: { persona: true, cargo: true, agrupacion: true },
          })
        : Promise.resolve([] as EquipoAsignacion[]),
      this.asistenteRepository.count({ where: { estudiante: { id } } }),
      // Director, apoyo y formadores de la escuela. Una persona que trabaja en
      // varias escuelas tiene una asignación por escuela, así que aparece aquí también.
      this.asignacionRepository.find({
        where: { escuela: { id: estudiante.escuela.id }, activo: true, persona: { activo: true } },
        relations: { persona: true, cargo: true },
      }),
    ]);

    const totalPorAgrupacion = new Map(integrantes.map((r) => [r.agrupacionId, Number(r.total)]));

    return {
      ...this.aVistaGestion(estudiante),
      escuela: {
        id: estudiante.escuela.id,
        nombre: estudiante.escuela.nombre,
        codigo: estudiante.escuela.codigo,
        direccion: estudiante.escuela.direccion ?? null,
        telefono: estudiante.escuela.telefono ?? null,
        email: estudiante.escuela.email ?? null,
        activa: estudiante.escuela.activa,
        equipo: equipoEscuela
          .sort((x, y) =>
            this.rangoCargo(x.cargo.nombre) - this.rangoCargo(y.cargo.nombre) ||
            x.persona.nombreCompleto.localeCompare(y.persona.nombreCompleto, 'es'))
          .map((a) => this.aMiembroEquipo(a)),
      },
      tieneUsuario: !!estudiante.usuario,
      totalInscripciones,
      agrupaciones: membresias.map((m) => ({
        id: m.agrupacion.id,
        nombre: m.agrupacion.nombre,
        descripcion: m.agrupacion.descripcion ?? null,
        activa: m.agrupacion.activa,
        membresiaActiva: m.activo,
        vinculadoDesde: m.creadoEn,
        totalIntegrantes: totalPorAgrupacion.get(m.agrupacionId) ?? 0,
        equipo: equipo
          .filter((a) => a.agrupacion?.id === m.agrupacionId)
          .map((a) => this.aMiembroEquipo(a)),
      })),
    };
  }

  private aMiembroEquipo(a: EquipoAsignacion) {
    return {
      nombre: a.persona.nombreCompleto,
      cargo: a.cargo.nombre,
      detalle: a.detalle,
      email: a.persona.email,
      telefono: a.persona.telefono,
    };
  }

  // Director primero, luego apoyo administrativo, luego el resto (formadores…)
  private rangoCargo(nombre: string): number {
    if (/director/i.test(nombre)) return 0;
    if (/apoyo/i.test(nombre)) return 1;
    return 2;
  }

  // No expone qrTokenMaster: es la credencial del carnet
  private aVistaGestion(e: Estudiante) {
    return {
      id: e.id,
      tipoDocumento: e.tipoDocumento,
      documento: e.documento,
      nombres: e.nombres,
      apellidos: e.apellidos,
      email: e.email ?? null,
      telefono: e.telefono ?? null,
      fechaNacimiento: e.fechaNacimiento ?? null,
      direccion: e.direccion ?? null,
      instrumento: e.instrumento ?? null,
      fotoUrl: e.fotoUrl ?? null,
      tieneNfc: !!e.nfcUid,
      escuela: e.escuela ? { id: e.escuela.id, nombre: e.escuela.nombre, codigo: e.escuela.codigo } : null,
      creadoEn: e.creadoEn,
      actualizadoEn: e.actualizadoEn,
    };
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

    // null en un campo opcional = vaciarlo (el panel de gestión lo usa así)
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