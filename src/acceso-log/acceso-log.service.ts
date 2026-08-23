// acceso-log.service.ts
import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccesoLog } from './entities/acceso-log.entity';
import { EstudiantesService } from '../estudiantes/estudiantes.service';
import { EventosService } from '../eventos/eventos.service';
import { MetodoIdentificacion } from '../estudiantes/dto/identificar-estudiante.dto';
import { MetodoLectura } from './entities/acceso-log.entity';
import { Asistente } from '../asistentes/entities/asistente.entity';
import { RegistrarAccesoDto } from './dto/registrar-acceso.dto';

@Injectable()
export class AccesoLogService {
  constructor(
    @InjectRepository(AccesoLog)
    private readonly accesoLogRepo: Repository<AccesoLog>,
    @InjectRepository(Asistente)
    private readonly asistenteRepo: Repository<Asistente>,
    private readonly estudiantesService: EstudiantesService,
    private readonly eventosService: EventosService,
  ) {}

  /**
   * Endpoint principal de la app del vigilante.
   * Dado un método de lectura + valor, identifica al estudiante (o al asistente
   * inscrito) y registra el acceso contra el evento correspondiente.
   */
  async registrarAcceso(dto: RegistrarAccesoDto) {
    if (!dto.asistenteId && !dto.escuelaId) {
      throw new BadRequestException(
        'Debe indicar asistenteId (evento con inscripción) o escuelaId (asistencia diaria).',
      );
    }

    // Caso 1: acceso a un evento con inscripción (concierto, etc.) — ya viene con asistenteId
    if (dto.asistenteId) {
      const asistente = await this.asistenteRepo.findOne({
        where: { id: dto.asistenteId },
        relations: { estudiante: true, evento: true },
      });
      if (!asistente) throw new NotFoundException('Asistente no encontrado.');

      const log = this.accesoLogRepo.create({
        asistente,
        estudiante: asistente.estudiante,
        evento: asistente.evento,
        operador: dto.operadorId ? ({ id: dto.operadorId } as any) : undefined,
        metodoLectura: dto.metodoLectura,
        fechaEscaneo: new Date(),
      });

      return this.accesoLogRepo.save(log);
    }

    // Caso 2: asistencia diaria a la escuela — se identifica al estudiante por el valor leído
    const metodoIdentificacion =
      dto.metodoLectura === MetodoLectura.NFC ? MetodoIdentificacion.NFC :
      dto.metodoLectura === MetodoLectura.QR ? MetodoIdentificacion.QR :
      MetodoIdentificacion.DOCUMENTO; // CEDULA_PDF417 y MANUAL se resuelven por documento

    const estudiante = await this.estudiantesService.identificar({
      metodo: metodoIdentificacion,
      valor: dto.valor,
    });

    const evento = await this.eventosService.obtenerOCrearEventoAsistenciaEscolar(dto.escuelaId!);

    const log = this.accesoLogRepo.create({
      estudiante,
      evento,
      operador: dto.operadorId ? ({ id: dto.operadorId } as any) : undefined,
      metodoLectura: dto.metodoLectura,
      fechaEscaneo: new Date(),
    });

    const guardado = await this.accesoLogRepo.save(log);

    // Devolvemos también los datos del estudiante para que el vigilante
    // pueda hacer la verificación visual con la foto (fotoUrl).
    return { accesoLog: guardado, estudiante };
  }

  findByEvento(eventoId: string): Promise<AccesoLog[]> {
    return this.accesoLogRepo.find({
      where: { evento: { id: eventoId } },
      relations: { estudiante: true, asistente: true, operador: true },
      order: { fechaEscaneo: 'DESC' },
    });
  }

  findByEstudiante(estudianteId: string): Promise<AccesoLog[]> {
    return this.accesoLogRepo.find({
      where: { estudiante: { id: estudianteId } },
      relations: { evento: true },
      order: { fechaEscaneo: 'DESC' },
    });
  }
}