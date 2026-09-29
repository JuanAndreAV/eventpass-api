import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../auth/roles-enum/role.enum';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Agrupacion } from './entities/agrupacion.entity';
import { Ciclo, EstadoCiclo } from './entities/ciclo.entity';
import { EscuelaRuta } from './entities/escuela-ruta.entity';
import { Instrumento } from './entities/instrumento.entity';
import { Ruta } from './entities/ruta.entity';
import { EstadoSolicitud, Solicitud } from './entities/solicitud.entity';
import { CreateSolicitudDto, UpdateSolicitudDto } from './dto/solicitud.dto';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  roles: string[];
}

interface FiltroSolicitudes {
  cicloId?: string;
  escuelaId?: string;
  estado?: EstadoSolicitud;
}

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud) private readonly solicitudRepo: Repository<Solicitud>,
    @InjectRepository(Ciclo) private readonly cicloRepo: Repository<Ciclo>,
    @InjectRepository(Estudiante) private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Escuela) private readonly escuelaRepo: Repository<Escuela>,
    @InjectRepository(Agrupacion) private readonly agrupacionRepo: Repository<Agrupacion>,
    @InjectRepository(EscuelaRuta) private readonly mapeoRepo: Repository<EscuelaRuta>,
  ) {}

  async create(dto: CreateSolicitudDto): Promise<Solicitud> {
    const ciclo = await this.cicloAbierto(dto.cicloId);
    const estudiante = await this.estudiantePorDocumento(dto.documento);

    const agrupacion = await this.agrupacionConvocada(ciclo, dto.agrupacionId);
    this.validarTrayectos(dto);
    this.validarAcompanante(dto.llevaAcompanante, agrupacion);
    await this.validarRegresoPosible(dto, agrupacion);

    const yaExiste = await this.solicitudRepo.exists({
      where: { ciclo: { id: ciclo.id }, estudiante: { id: estudiante.id } },
    });
    if (yaExiste) {
      throw new ConflictException(
        'Ya existe una solicitud para este documento en la convocatoria seleccionada',
      );
    }

    const solicitud = this.solicitudRepo.create({
      ciclo: { id: ciclo.id } as Ciclo,
      estudiante: { id: estudiante.id } as Estudiante,
      escuela: { id: estudiante.escuela.id } as Escuela,
      agrupacion: { id: dto.agrupacionId } as Agrupacion,
      llevaInstrumento: dto.llevaInstrumento,
      instrumento: dto.instrumentoId ? ({ id: dto.instrumentoId } as Instrumento) : null,
      llevaAcompanante: dto.llevaAcompanante ?? false,
      requiereIda: dto.requiereIda,
      escuelaSalida: dto.escuelaSalidaId ? ({ id: dto.escuelaSalidaId } as Escuela) : null,
      requiereRegreso: dto.requiereRegreso,
      escuelaLlegada: dto.escuelaLlegadaId ? ({ id: dto.escuelaLlegadaId } as Escuela) : null,
      telefonoContacto: dto.telefonoContacto,
      telefonoAcudiente: dto.telefonoAcudiente,
      observacion: dto.observacion,
      estado: EstadoSolicitud.PENDIENTE,
    });

    const guardada = await this.solicitudRepo.save(solicitud);
    return this.findOne(guardada.id);
  }

  async findAll(filtro: FiltroSolicitudes, usuario: UsuarioAutenticado): Promise<Solicitud[]> {
    const escuelasPermitidas = await this.escuelasVisiblesPara(usuario);

    return this.solicitudRepo.find({
      where: {
        ...(filtro.cicloId ? { ciclo: { id: filtro.cicloId } } : {}),
        ...(filtro.estado ? { estado: filtro.estado } : {}),
        ...(filtro.escuelaId
          ? { escuela: { id: filtro.escuelaId } }
          : escuelasPermitidas
            ? { escuela: { id: In(escuelasPermitidas) } }
            : {}),
      },
      relations: {
        ciclo: true, estudiante: true, escuela: true, agrupacion: true,
        instrumento: true, escuelaSalida: true, escuelaLlegada: true, revisadaPor: true,
      },
      order: { creadoEn: 'DESC' },
    });
  }

  // Consulta del solicitante: sus propias solicitudes, identificándose con el documento.
  async findByDocumento(documento: string): Promise<Solicitud[]> {
    const estudiante = await this.estudiantePorDocumento(documento);
    return this.solicitudRepo.find({
      where: { estudiante: { id: estudiante.id } },
      relations: {
        ciclo: true, escuela: true, agrupacion: true, instrumento: true,
        escuelaSalida: true, escuelaLlegada: true,
      },
      order: { creadoEn: 'DESC' },
    });
  }

  // El solicitante no tiene cuenta: su "perfil" es la última solicitud que envió.
  // El formulario la usa para prellenarse cuando teclea su documento.
  async ultimaPorDocumento(documento: string): Promise<Solicitud | null> {
    const estudiante = await this.estudiantePorDocumento(documento);
    return this.solicitudRepo.findOne({
      where: { estudiante: { id: estudiante.id } },
      relations: {
        ciclo: true, escuela: true, agrupacion: true, instrumento: true,
        escuelaSalida: true, escuelaLlegada: true,
      },
      order: { creadoEn: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Solicitud> {
    const solicitud = await this.solicitudRepo.findOne({
      where: { id },
      relations: {
        ciclo: true, estudiante: true, escuela: { apoyoAdministrativo: true },
        agrupacion: true, instrumento: true, escuelaSalida: true,
        escuelaLlegada: true, revisadaPor: true,
      },
    });
    if (!solicitud) throw new NotFoundException(`La solicitud con ID ${id} no existe`);
    return solicitud;
  }

  // Hasta la fecha de cierre edita el propio estudiante (sin cuenta); después,
  // solo el administrativo. `usuario` llega solo si la petición trae sesión.
  async update(
    id: string,
    dto: UpdateSolicitudDto,
    usuario?: UsuarioAutenticado,
  ): Promise<Solicitud> {
    const solicitud = await this.findOne(id);
    const administrativo = this.esAdministrativo(usuario);

    if (administrativo) {
      await this.verificarPuedeRevisar(solicitud, usuario!);
    } else {
      // El estudiante puede corregir su solicitud mientras la convocatoria siga
      // abierta, incluso si ya se la aprobaron: en ese caso vuelve a quedar
      // pendiente porque la secretaría aprobó otros datos.
      await this.cicloAbierto(solicitud.ciclo.id);
    }

    const ciclo = await this.cicloRepo.findOne({
      where: { id: solicitud.ciclo.id },
      relations: { agrupaciones: true },
    });

    let agrupacion = await this.agrupacionConRuta(solicitud.agrupacion.id);
    if (dto.agrupacionId && dto.agrupacionId !== solicitud.agrupacion.id) {
      agrupacion = await this.agrupacionConvocada(ciclo!, dto.agrupacionId);
      solicitud.agrupacion = agrupacion;
    }

    // La entidad guarda relaciones (escuelaSalida) y el DTO ids (escuelaSalidaId):
    // hay que traducir al fusionar o la validacion no encuentra las escuelas y
    // rechaza cualquier edicion parcial.
    const propuesta: CreateSolicitudDto = {
      cicloId: solicitud.ciclo.id,
      documento: solicitud.estudiante.documento,
      agrupacionId: agrupacion.id,
      llevaInstrumento: dto.llevaInstrumento ?? solicitud.llevaInstrumento,
      instrumentoId:
        dto.instrumentoId !== undefined ? dto.instrumentoId : solicitud.instrumento?.id,
      llevaAcompanante: dto.llevaAcompanante ?? solicitud.llevaAcompanante,
      requiereIda: dto.requiereIda ?? solicitud.requiereIda,
      escuelaSalidaId:
        dto.escuelaSalidaId !== undefined ? dto.escuelaSalidaId : solicitud.escuelaSalida?.id,
      requiereRegreso: dto.requiereRegreso ?? solicitud.requiereRegreso,
      escuelaLlegadaId:
        dto.escuelaLlegadaId !== undefined ? dto.escuelaLlegadaId : solicitud.escuelaLlegada?.id,
    };

    this.validarTrayectos(propuesta);
    this.validarAcompanante(propuesta.llevaAcompanante, agrupacion);
    await this.validarRegresoPosible(propuesta, agrupacion);

    if (dto.llevaAcompanante !== undefined) solicitud.llevaAcompanante = dto.llevaAcompanante;
    if (dto.llevaInstrumento !== undefined) solicitud.llevaInstrumento = dto.llevaInstrumento;
    if (dto.instrumentoId !== undefined) {
      solicitud.instrumento = dto.instrumentoId ? ({ id: dto.instrumentoId } as Instrumento) : null;
    }
    if (dto.requiereIda !== undefined) solicitud.requiereIda = dto.requiereIda;
    if (dto.escuelaSalidaId !== undefined) {
      solicitud.escuelaSalida = dto.escuelaSalidaId ? ({ id: dto.escuelaSalidaId } as Escuela) : null;
    }
    if (dto.requiereRegreso !== undefined) solicitud.requiereRegreso = dto.requiereRegreso;
    if (dto.escuelaLlegadaId !== undefined) {
      solicitud.escuelaLlegada = dto.escuelaLlegadaId ? ({ id: dto.escuelaLlegadaId } as Escuela) : null;
    }
    if (dto.telefonoContacto !== undefined) solicitud.telefonoContacto = dto.telefonoContacto;
    if (dto.telefonoAcudiente !== undefined) solicitud.telefonoAcudiente = dto.telefonoAcudiente;
    if (dto.observacion !== undefined) solicitud.observacion = dto.observacion;

    // Una edición del estudiante invalida la revisión previa: vuelve a la cola.
    if (!administrativo && solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      solicitud.estado = EstadoSolicitud.PENDIENTE;
      solicitud.motivoRechazo = undefined;
      solicitud.revisadaPor = null;
      solicitud.revisadaEn = null;
    }

    await this.solicitudRepo.save(solicitud);
    return this.findOne(id);
  }

  async aprobar(id: string, usuario: UsuarioAutenticado): Promise<Solicitud> {
    const solicitud = await this.findOne(id);
    await this.verificarPuedeRevisar(solicitud, usuario);

    solicitud.estado = EstadoSolicitud.APROBADA;
    solicitud.motivoRechazo = undefined;
    solicitud.revisadaPor = { id: usuario.id } as Usuario;
    solicitud.revisadaEn = new Date();

    await this.solicitudRepo.save(solicitud);
    return this.findOne(id);
  }

  async rechazar(id: string, motivo: string | undefined, usuario: UsuarioAutenticado): Promise<Solicitud> {
    const solicitud = await this.findOne(id);
    await this.verificarPuedeRevisar(solicitud, usuario);

    solicitud.estado = EstadoSolicitud.RECHAZADA;
    solicitud.motivoRechazo = motivo;
    solicitud.revisadaPor = { id: usuario.id } as Usuario;
    solicitud.revisadaEn = new Date();

    await this.solicitudRepo.save(solicitud);
    return this.findOne(id);
  }

  private async cicloAbierto(cicloId: string): Promise<Ciclo> {
    const ciclo = await this.cicloRepo.findOne({
      where: { id: cicloId },
      relations: { agrupaciones: true },
    });
    if (!ciclo) throw new NotFoundException(`El ciclo con ID ${cicloId} no existe`);

    if (ciclo.estado !== EstadoCiclo.ABIERTO) {
      throw new BadRequestException('La convocatoria no está abierta para recibir solicitudes');
    }
    if (ciclo.fechaCierre <= new Date()) {
      throw new BadRequestException('La convocatoria ya pasó su fecha de cierre');
    }

    return ciclo;
  }

  private async estudiantePorDocumento(documento: string): Promise<Estudiante> {
    const estudiante = await this.estudianteRepo.findOne({
      where: { documento },
      relations: { escuela: true },
    });
    if (!estudiante) {
      throw new NotFoundException(
        `No hay un estudiante registrado con el documento ${documento}. Solicita a tu escuela que te registre primero.`,
      );
    }
    return estudiante;
  }

  private async agrupacionConvocada(ciclo: Ciclo, agrupacionId: string): Promise<Agrupacion> {
    if (!ciclo.agrupaciones.some((a) => a.id === agrupacionId)) {
      throw new BadRequestException('La agrupación seleccionada no fue convocada en este ciclo');
    }
    return this.agrupacionConRuta(agrupacionId);
  }

  private async agrupacionConRuta(agrupacionId: string): Promise<Agrupacion> {
    const agrupacion = await this.agrupacionRepo.findOne({
      where: { id: agrupacionId },
      relations: { ruta: true },
    });
    if (!agrupacion) {
      throw new NotFoundException(`La agrupación con ID ${agrupacionId} no existe`);
    }
    return agrupacion;
  }

  private validarAcompanante(llevaAcompanante: boolean | undefined, agrupacion: Agrupacion): void {
    if (llevaAcompanante && !agrupacion.permiteAcompanante) {
      throw new BadRequestException(
        `La agrupación ${agrupacion.nombre} no admite acompañante`,
      );
    }
  }

  // Hay rutas de un solo recorrido (R11 - Coro Inicial): quien viaje por ellas no
  // puede pedir regreso. Se resuelve igual que en el cálculo: la ruta propia de la
  // agrupación manda sobre la de la escuela.
  private async validarRegresoPosible(
    dto: CreateSolicitudDto,
    agrupacion: Agrupacion,
  ): Promise<void> {
    if (!dto.requiereRegreso) return;

    const ruta = await this.rutaDelRegreso(dto.escuelaLlegadaId, agrupacion);
    if (ruta?.soloIda) {
      throw new BadRequestException(
        `La ruta ${ruta.codigo} (${ruta.nombre}) solo hace el trayecto de ida, así que no puedes solicitar regreso por ella`,
      );
    }
  }

  private async rutaDelRegreso(
    escuelaLlegadaId: string | undefined,
    agrupacion: Agrupacion,
  ): Promise<Ruta | null> {
    if (agrupacion.ruta) return agrupacion.ruta;
    if (!escuelaLlegadaId) return null;

    const mapeo = await this.mapeoRepo.findOne({
      where: { escuela: { id: escuelaLlegadaId } },
      relations: { ruta: true },
    });
    return mapeo?.ruta ?? null;
  }

  private esAdministrativo(usuario?: UsuarioAutenticado): boolean {
    return !!usuario?.roles?.some((rol) => rol === Role.Admin || rol === Role.Secretaria);
  }

  private validarTrayectos(dto: CreateSolicitudDto): void {
    if (!dto.requiereIda && !dto.requiereRegreso) {
      throw new BadRequestException('Debes solicitar al menos el trayecto de ida o el de regreso');
    }
    if (dto.requiereIda && !dto.escuelaSalidaId) {
      throw new BadRequestException('Indica la escuela de salida para el trayecto de ida');
    }
    if (dto.requiereRegreso && !dto.escuelaLlegadaId) {
      throw new BadRequestException('Indica la escuela de llegada para el trayecto de regreso');
    }
    if (dto.llevaInstrumento && !dto.instrumentoId) {
      throw new BadRequestException('Indica cuál instrumento llevas');
    }
  }

  // null = sin restricción (admin). Una lista = solo esas escuelas (secretaria).
  private async escuelasVisiblesPara(usuario: UsuarioAutenticado): Promise<string[] | null> {
    if (usuario.roles?.includes(Role.Admin)) return null;

    const escuelas = await this.escuelaRepo.find({
      where: { apoyoAdministrativo: { id: usuario.id } },
      select: { id: true },
    });
    return escuelas.map((e) => e.id);
  }

  private async verificarPuedeRevisar(
    solicitud: Solicitud,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    const escuelasPermitidas = await this.escuelasVisiblesPara(usuario);
    if (escuelasPermitidas === null) return;

    if (!escuelasPermitidas.includes(solicitud.escuela.id)) {
      throw new ForbiddenException('Solo puedes revisar solicitudes de tu propia escuela');
    }
  }
}
