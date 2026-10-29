// inscripcion-red/inscripcion-red.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Asistente, CategoriaInscripcionRed, RedPrograma, TipoAsistente } from '../asistentes/entities/asistente.entity';
import { EquipoInternoService } from '../equipo-interno/equipo-interno.service';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { Evento } from '../eventos/entities/evento.entity';
import { ConfirmarInscripcionRedDto } from './dto/confirmar-inscripcion-red.dto';
import { CreateInscripcionRedDto, RolMusica, RolRpac } from './dto/create-inscripcion-red.dto';

const ROLES_EQUIPO_MUSICA: string[] = [
  RolMusica.EQUIPO_GESTION, RolMusica.EQUIPO_COORDINADOR, RolMusica.APOYO_ADMINISTRATIVO,
];
const ROLES_EQUIPO_RPAC: string[] = [RolRpac.COORDINADOR, RolRpac.APOYO_ADMINISTRATIVO];

// Mensaje para cuando nadie definió un cupo para esa categoría en este evento
// (el admin no la activó) o cuando no calza en ninguna.
const SIN_CATEGORIA = 'No hay un cupo disponible para tu red, rol y edad en este evento.';

// Señal específica (no un mensaje para mostrar tal cual) que el frontend
// detecta para caer al formulario manual de siempre, en el pequeño % de
// casos donde el registro ya existente (estudiante o equipo interno) no
// tiene correo/celular/fecha de nacimiento completos como para
// autocompletar la inscripción de un clic.
export const DATOS_INCOMPLETOS = 'DATOS_INCOMPLETOS';

// Señal para cuando el estudiante identificado resulta menor de edad: no hay
// nombre de acudiente en la tabla estudiantes, así que esto sí hay que
// pedirlo — el frontend reintenta la confirmación mandándolo.
export const ACUDIENTE_REQUERIDO = 'ACUDIENTE_REQUERIDO';

export type OrigenIdentificacionRed = 'ESTUDIANTE' | 'EQUIPO_INTERNO';

// Lo que el formulario público pide ANTES de mostrar el resto de los campos:
// con solo el documento, le dice a la persona si ya la reconoce como
// estudiante de una escuela de música o como equipo interno (para no
// hacerle elegir red/rol a mano cuando ya se sabe), o si no aparece en
// ninguna de las dos (en cuyo caso llena el resto del formulario y la
// categoría que termine eligiendo queda sujeta a la misma validación de
// siempre en determinarCategoria/crear).
//
// Deliberadamente NO incluye nombre/correo/escuela: verificar solo con el
// número de documento no prueba que la persona sea quien dice ser, y
// devolver esos datos filtraría la identidad de otra persona a quien solo
// conozca o adivine su documento (mismo criterio ya aplicado en el flujo de
// inscripcion-evento/verificarDocumento).
export interface IdentificacionInscripcionRed {
  yaInscrito: boolean;
  encontrado: boolean;
  origen?: OrigenIdentificacionRed;
}

// Forma de respuesta que ya conocía el frontend desde que esto vivía en su
// propia tabla "inscripciones_red" — se conserva igual (nombre/celular/
// correo/creadoEn en vez de los nombres reales de columna en Asistente) para
// no tener que tocar el frontend al migrar los datos a "asistentes".
export interface InscripcionRedView {
  id: string;
  eventoId: string;
  red: RedPrograma;
  rol: string;
  rolOtro?: string | null;
  categoria: CategoriaInscripcionRed;
  nombre: string;
  tipoDocumento: CreateInscripcionRedDto['tipoDocumento'];
  documento: string;
  escuela: string | null;
  celular: string | null;
  correo: string | null;
  edad: number | null;
  nombreAcudiente?: string | null;
  creadoEn: Date;
}

@Injectable()
export class InscripcionRedService {
  constructor(
    @InjectRepository(Asistente) private readonly asistenteRepo: Repository<Asistente>,
    @InjectRepository(Evento) private readonly eventoRepo: Repository<Evento>,
    @InjectRepository(Estudiante) private readonly estudianteRepo: Repository<Estudiante>,
    private readonly equipoInternoService: EquipoInternoService,
  ) {}

  async crear(dto: CreateInscripcionRedDto): Promise<InscripcionRedView> {
    const evento = await this.eventoRepo.findOneBy({ id: dto.eventoId });
    if (!evento) throw new NotFoundException(`El evento con ID ${dto.eventoId} no existe`);
    if (!evento.usaFormularioRed) {
      throw new BadRequestException('Este evento no usa el formulario de inscripción por red');
    }

    // Antes que nada: si ya se inscribió (a este evento, por cualquier vía —
    // el índice único de "asistentes" es por documento+evento sin importar
    // el tipo), que el mensaje sea ese y no "cupo lleno".
    const yaExiste = await this.asistenteRepo.exists({
      where: { evento: { id: evento.id }, documento: dto.documento },
    });
    if (yaExiste) {
      throw new ConflictException('Ya existe una inscripción con ese documento para este evento.');
    }

    this.validarRol(dto);
    const categoria = await this.determinarCategoria(dto);
    if (!categoria) throw new BadRequestException(SIN_CATEGORIA);

    const cupo = this.cupoDe(evento, categoria);
    if (cupo === null || cupo === undefined) throw new BadRequestException(SIN_CATEGORIA);

    const inscritos = await this.asistenteRepo.count({
      where: { evento: { id: evento.id }, tipo: TipoAsistente.RED, categoria },
    });
    if (inscritos >= cupo) {
      throw new ConflictException('Ya se llenó el cupo disponible para tu categoría en este evento.');
    }

    // Si el documento resulta ser un estudiante real (típicamente rol
    // Participante, ya validado en determinarCategoria), se enlaza la
    // relación — el escáner y los reportes del flujo general ya saben
    // aprovecharla (foto, historial de accesos, etc.).
    const estudiante = await this.estudianteRepo.findOneBy({ documento: dto.documento });

    const asistente = this.asistenteRepo.create({
      evento,
      tipo: TipoAsistente.RED,
      estudiante: estudiante ?? undefined,
      red: dto.red,
      rol: dto.rol,
      rolOtro: dto.rolOtro ?? null,
      categoria,
      nombreCompleto: dto.nombre,
      tipoDocumento: dto.tipoDocumento,
      documento: dto.documento,
      escuela: dto.escuela,
      telefono: dto.celular,
      email: dto.correo,
      edad: dto.edad ?? null,
      nombreAcudiente: dto.nombreAcudiente ?? null,
      qrToken: randomUUID(),
      ingresado: false,
    });

    let guardado: Asistente;
    try {
      guardado = await this.asistenteRepo.save(asistente);
    } catch (error: unknown) {
      const anyErr = error as { code?: string };
      if (anyErr.code === '23505') {
        throw new ConflictException('Ya existe una inscripción con ese documento para este evento.');
      }
      throw error;
    }

    return this.aVista(guardado);
  }

  // Paso 1 del formulario público: con solo el documento, identifica si la
  // persona ya es estudiante registrado o equipo interno, antes de pedirle
  // el resto de los datos.
  async identificar(eventoId: string, documento: string): Promise<IdentificacionInscripcionRed> {
    const evento = await this.eventoRepo.findOneBy({ id: eventoId });
    if (!evento) throw new NotFoundException(`El evento con ID ${eventoId} no existe`);

    const yaInscrito = await this.asistenteRepo.exists({
      where: { evento: { id: evento.id }, documento },
    });
    if (yaInscrito) return { yaInscrito: true, encontrado: false };

    const esEstudiante = await this.estudianteRepo.exists({ where: { documento } });
    if (esEstudiante) return { yaInscrito: false, encontrado: true, origen: 'ESTUDIANTE' };

    const esEquipoInterno = await this.equipoInternoService.existeActivo(documento);
    if (esEquipoInterno) return { yaInscrito: false, encontrado: true, origen: 'EQUIPO_INTERNO' };

    return { yaInscrito: false, encontrado: false };
  }

  // Paso 2 "de un clic": para alguien que el paso 1 ya identificó como
  // estudiante o equipo interno, no le vuelve a pedir nada — resuelve el
  // resto de los campos del registro que ya existe y reutiliza crear() para
  // no duplicar la validación de cupos/categoría.
  //
  // Vuelve a buscar el documento en vez de confiar en lo que diga el
  // cliente (no recibe "origen" como parámetro): si alguien manipulara la
  // petición para decir que es equipo interno sin estarlo, esto no se lo
  // permite porque determinarCategoria/exigirEquipoInterno lo revalida igual.
  async confirmar(dto: ConfirmarInscripcionRedDto): Promise<InscripcionRedView> {
    const estudiante = await this.estudianteRepo.findOne({
      where: { documento: dto.documento },
      relations: { escuela: true },
    });
    if (estudiante) {
      if (!estudiante.email || !estudiante.telefono || !estudiante.fechaNacimiento) {
        throw new BadRequestException(DATOS_INCOMPLETOS);
      }
      const edad = this.calcularEdad(estudiante.fechaNacimiento);
      // Antes que pedir el acudiente: si de todas formas no va a calificar
      // por edad, que se entere de eso primero y no de un dato que al final
      // no hacía falta.
      if (edad < 10) {
        throw new BadRequestException('Este programa está disponible para personas de 10 años en adelante.');
      }
      if (edad < 18 && !dto.nombreAcudiente) {
        throw new BadRequestException(ACUDIENTE_REQUERIDO);
      }
      return this.crear({
        eventoId: dto.eventoId,
        red: RedPrograma.MUSICA,
        rol: RolMusica.PARTICIPANTE,
        nombre: `${estudiante.nombres} ${estudiante.apellidos}`.trim(),
        tipoDocumento: dto.tipoDocumento,
        documento: dto.documento,
        escuela: estudiante.escuela.nombre,
        celular: estudiante.telefono,
        correo: estudiante.email,
        edad,
        nombreAcudiente: edad < 18 ? dto.nombreAcudiente : undefined,
      });
    }

    const equipoInterno = await this.equipoInternoService.buscarActivo(dto.documento);
    if (equipoInterno) {
      if (!equipoInterno.email || !equipoInterno.telefono) {
        throw new BadRequestException(DATOS_INCOMPLETOS);
      }
      return this.crear({
        eventoId: dto.eventoId,
        // equipo_interno_personas es específicamente el personal de la Red
        // de Músicas (Fundación UdeA) — no hay equipo interno de RPAC en
        // esta tabla, así que no hace falta preguntarle la red.
        red: RedPrograma.MUSICA,
        rol: RolMusica.EQUIPO_GESTION,
        nombre: equipoInterno.nombreCompleto,
        tipoDocumento: dto.tipoDocumento,
        documento: dto.documento,
        escuela: 'Equipo interno — Red de Músicas',
        celular: equipoInterno.telefono,
        correo: equipoInterno.email,
      });
    }

    throw new NotFoundException('No identificamos este documento como estudiante o equipo interno.');
  }

  private calcularEdad(fechaNacimiento: Date): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const aunNoCumpleEsteAnio =
      hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
    if (aunNoCumpleEsteAnio) edad--;
    return edad;
  }

  async findByEvento(eventoId: string): Promise<InscripcionRedView[]> {
    const asistentes = await this.asistenteRepo.find({
      where: { evento: { id: eventoId }, tipo: TipoAsistente.RED },
      relations: { evento: true },
      order: { fechaInscripcion: 'DESC' },
    });
    return asistentes.map((a) => this.aVista(a));
  }

  // Cuántos cupos quedan por categoría, para que el formulario público (y el
  // panel admin) sepan qué mostrar como lleno sin tener que listar a todos.
  async resumenCupos(eventoId: string): Promise<Record<CategoriaInscripcionRed, { cupo: number | null; inscritos: number }>> {
    const evento = await this.eventoRepo.findOneBy({ id: eventoId });
    if (!evento) throw new NotFoundException(`El evento con ID ${eventoId} no existe`);

    const categorias = Object.values(CategoriaInscripcionRed);
    const resumen = {} as Record<CategoriaInscripcionRed, { cupo: number | null; inscritos: number }>;
    for (const categoria of categorias) {
      const cupo = this.cupoDe(evento, categoria) ?? null;
      const inscritos = await this.asistenteRepo.count({
        where: { evento: { id: eventoId }, tipo: TipoAsistente.RED, categoria },
      });
      resumen[categoria] = { cupo, inscritos };
    }
    return resumen;
  }

  private aVista(a: Asistente): InscripcionRedView {
    return {
      id: a.id,
      eventoId: a.evento.id,
      red: a.red!,
      rol: a.rol!,
      rolOtro: a.rolOtro,
      categoria: a.categoria!,
      nombre: a.nombreCompleto,
      tipoDocumento: a.tipoDocumento!,
      documento: a.documento,
      escuela: a.escuela,
      celular: a.telefono,
      correo: a.email,
      edad: a.edad,
      nombreAcudiente: a.nombreAcudiente,
      creadoEn: a.fechaInscripcion,
    };
  }

  private validarRol(dto: CreateInscripcionRedDto): void {
    const rolesValidos: string[] =
      dto.red === RedPrograma.MUSICA ? Object.values(RolMusica) : Object.values(RolRpac);
    if (!rolesValidos.includes(dto.rol)) {
      throw new BadRequestException(`El rol "${dto.rol}" no es válido para la red seleccionada`);
    }
  }

  // El rol manda primero (equipo interno y laboratorio red no dependen de la
  // edad), y solo si no es ninguno de esos se usa la edad para ubicar al
  // participante de Música en el tramo 10-15 o 16-28. RPAC sin rol de equipo
  // siempre es la categoría RPAC, sin tramos de edad. Devuelve null cuando no
  // hay ninguna categoría que calce (ej. Música, Participante, 40 años).
  //
  // Validación cruzada contra datos reales (no solo lo autodeclarado en el
  // formulario):
  //   - EQUIPO_INTERNO: el documento debe existir en equipo_interno_personas
  //     (tabla de personal de la Fundación UdeA) y estar activo.
  //   - NINOS_MUSICA / JOVENES_MUSICA, solo cuando el rol es PARTICIPANTE
  //     (no ARTISTA_FORMADOR, que es personal de formación, no un
  //     estudiante): el documento debe existir en la tabla `estudiantes`.
  //   - LABORATORIO_RED: también exige estudiante — niños, jóvenes y
  //     laboratorio son los tres tramos de la misma Red de Músicas, todos
  //     viven en `estudiantes`. Quien no aparece en ninguna base de datos
  //     (ni estudiantes ni equipo_interno_personas) es, por definición, de
  //     Red de Prácticas (RPAC) — no se valida contra nada porque RPAC no
  //     exige estar pre-registrado.
  private async determinarCategoria(dto: CreateInscripcionRedDto): Promise<CategoriaInscripcionRed | null> {
    const { red, rol, edad, documento } = dto;

    if (red === RedPrograma.MUSICA && ROLES_EQUIPO_MUSICA.includes(rol)) {
      await this.exigirEquipoInterno(documento);
      return CategoriaInscripcionRed.EQUIPO_INTERNO;
    }
    if (red === RedPrograma.RPAC && ROLES_EQUIPO_RPAC.includes(rol)) {
      await this.exigirEquipoInterno(documento);
      return CategoriaInscripcionRed.EQUIPO_INTERNO;
    }
    if (red === RedPrograma.MUSICA && rol === RolMusica.LABORATORIO_RED) {
      // Laboratorio Red también es gente de la Red de Músicas (igual que
      // niños/jóvenes): debe existir en `estudiantes`, no solo declararlo.
      await this.exigirEstudiante(documento);
      return CategoriaInscripcionRed.LABORATORIO_RED;
    }
    if (red === RedPrograma.RPAC) {
      return CategoriaInscripcionRed.RPAC;
    }
    // red === MUSICA, rol === PARTICIPANTE | ARTISTA_FORMADOR. Son los únicos
    // dos casos que sí necesitan la edad (para el tramo NINOS/JOVENES), así
    // que aquí sí se exige — a diferencia de EQUIPO_INTERNO, que no la usa y
    // por eso edad quedó opcional en el DTO.
    if (edad === undefined || edad === null) {
      throw new BadRequestException('Debes indicar tu edad.');
    }
    // Mensaje propio en vez de caer en el genérico "sin cupo disponible":
    // no es un problema de cupos, es que el programa no cubre esta edad.
    if (edad < 10) {
      throw new BadRequestException('Este programa está disponible para personas de 10 años en adelante.');
    }
    if (rol === RolMusica.PARTICIPANTE) {
      await this.exigirEstudiante(documento);
    }
    // NINOS_MUSICA: el cupo es de formularios (uno por niño), no de personas
    // — la familia que lo acompaña no cuenta aparte ni se registra.
    if (edad >= 10 && edad <= 15) return CategoriaInscripcionRed.NINOS_MUSICA;
    if (edad >= 16 && edad <= 28) return CategoriaInscripcionRed.JOVENES_MUSICA;
    // Estudiante real (ya validado arriba) de más de 28 años: cae en
    // Laboratorio Red, no se queda sin categoría. Artista Formador fuera de
    // estos tramos sigue sin categoría (no es a quien aplica esta regla).
    if (rol === RolMusica.PARTICIPANTE && edad > 28) return CategoriaInscripcionRed.LABORATORIO_RED;
    return null;
  }

  private async exigirEquipoInterno(documento: string): Promise<void> {
    const esEquipoInterno = await this.equipoInternoService.existeActivo(documento);
    if (!esEquipoInterno) {
      throw new BadRequestException(
        'El documento ingresado no corresponde a una persona registrada como equipo interno.',
      );
    }
  }

  private async exigirEstudiante(documento: string): Promise<void> {
    const esEstudiante = await this.estudianteRepo.exists({ where: { documento } });
    if (!esEstudiante) {
      throw new BadRequestException(
        'El documento ingresado no corresponde a un estudiante registrado en la red.',
      );
    }
  }

  private cupoDe(evento: Evento, categoria: CategoriaInscripcionRed): number | null | undefined {
    switch (categoria) {
      case CategoriaInscripcionRed.NINOS_MUSICA: return evento.cupoNinosMusica;
      case CategoriaInscripcionRed.JOVENES_MUSICA: return evento.cupoJovenesMusica;
      case CategoriaInscripcionRed.LABORATORIO_RED: return evento.cupoLaboratorioRed;
      case CategoriaInscripcionRed.RPAC: return evento.cupoRpac;
      case CategoriaInscripcionRed.EQUIPO_INTERNO: return evento.cupoEquipoInterno;
    }
  }
}
