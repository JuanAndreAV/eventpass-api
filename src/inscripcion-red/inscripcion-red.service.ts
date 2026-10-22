// inscripcion-red/inscripcion-red.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipoInternoService } from '../equipo-interno/equipo-interno.service';
import { Estudiante } from '../estudiantes/entities/estudiante.entity';
import { Evento } from '../eventos/entities/evento.entity';
import { CreateInscripcionRedDto, RolMusica, RolRpac } from './dto/create-inscripcion-red.dto';
import { CategoriaInscripcionRed, InscripcionRed, RedPrograma } from './entities/inscripcion-red.entity';

const ROLES_EQUIPO_MUSICA: string[] = [
  RolMusica.EQUIPO_GESTION, RolMusica.EQUIPO_COORDINADOR, RolMusica.APOYO_ADMINISTRATIVO,
];
const ROLES_EQUIPO_RPAC: string[] = [RolRpac.COORDINADOR, RolRpac.APOYO_ADMINISTRATIVO];

// Mensaje para cuando nadie definió un cupo para esa categoría en este evento
// (el admin no la activó) o cuando no calza en ninguna.
const SIN_CATEGORIA = 'No hay un cupo disponible para tu red, rol y edad en este evento.';

@Injectable()
export class InscripcionRedService {
  constructor(
    @InjectRepository(InscripcionRed) private readonly inscripcionRepo: Repository<InscripcionRed>,
    @InjectRepository(Evento) private readonly eventoRepo: Repository<Evento>,
    @InjectRepository(Estudiante) private readonly estudianteRepo: Repository<Estudiante>,
    private readonly equipoInternoService: EquipoInternoService,
  ) {}

  async crear(dto: CreateInscripcionRedDto): Promise<InscripcionRed> {
    const evento = await this.eventoRepo.findOneBy({ id: dto.eventoId });
    if (!evento) throw new NotFoundException(`El evento con ID ${dto.eventoId} no existe`);
    if (!evento.usaFormularioRed) {
      throw new BadRequestException('Este evento no usa el formulario de inscripción por red');
    }

    // Antes que nada: si ya se inscribió, que el mensaje sea ese y no "cupo
    // lleno" (que sería confuso si el cupo está lleno justo por su propia
    // inscripción).
    const yaExiste = await this.inscripcionRepo.exists({
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

    const inscritos = await this.inscripcionRepo.count({
      where: { evento: { id: evento.id }, categoria },
    });
    if (inscritos >= cupo) {
      throw new ConflictException('Ya se llenó el cupo disponible para tu categoría en este evento.');
    }

    const inscripcion = this.inscripcionRepo.create({
      evento,
      red: dto.red,
      rol: dto.rol,
      rolOtro: dto.rolOtro,
      categoria,
      nombre: dto.nombre,
      tipoDocumento: dto.tipoDocumento,
      documento: dto.documento,
      escuela: dto.escuela,
      celular: dto.celular,
      correo: dto.correo,
      edad: dto.edad,
      nombreAcudiente: dto.nombreAcudiente,
    });

    return this.inscripcionRepo.save(inscripcion);
  }

  async findByEvento(eventoId: string): Promise<InscripcionRed[]> {
    return this.inscripcionRepo.find({
      where: { evento: { id: eventoId } },
      order: { creadoEn: 'DESC' },
    });
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
      const inscritos = await this.inscripcionRepo.count({ where: { evento: { id: eventoId }, categoria } });
      resumen[categoria] = { cupo, inscritos };
    }
    return resumen;
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
      return CategoriaInscripcionRed.LABORATORIO_RED;
    }
    if (red === RedPrograma.RPAC) {
      return CategoriaInscripcionRed.RPAC;
    }
    // red === MUSICA, rol === PARTICIPANTE | ARTISTA_FORMADOR.
    if (rol === RolMusica.PARTICIPANTE) {
      await this.exigirEstudiante(documento);
    }
    // NINOS_MUSICA: el cupo es de formularios (uno por niño), no de personas
    // — la familia que lo acompaña no cuenta aparte ni se registra.
    if (edad >= 10 && edad <= 15) return CategoriaInscripcionRed.NINOS_MUSICA;
    if (edad >= 16 && edad <= 28) return CategoriaInscripcionRed.JOVENES_MUSICA;
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
