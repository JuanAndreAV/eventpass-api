import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estudiante } from './entities/estudiante.entity';
import { Escuela } from '../escuelas/entities/escuela.entity';
import { CreateEstudianteDto } from './dto/create-estudiante.dto';

@Injectable()
export class EstudiantesService {
  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepository: Repository<Estudiante>,
    @InjectRepository(Escuela)
    private readonly escuelaRepository: Repository<Escuela>,
  ) {}

  async create(createEstudianteDto: CreateEstudianteDto): Promise<Estudiante> {
    const { escuelaId, usuarioId, ...datosEstudiante } = createEstudianteDto;

    // 1. Validar existencia de la Escuela
    const escuela = await this.escuelaRepository.findOne({
      where: { id: escuelaId },
    });

    if (!escuela) {
      throw new NotFoundException(
        `La escuela con el ID "${escuelaId}" no existe.`,
      );
    }

    // 2. Construir la entidad usando 'undefined' en vez de 'null'
    const nuevoEstudiante = this.estudianteRepository.create({
      ...datosEstudiante,
      escuela,
      usuario: usuarioId ? ({ id: usuarioId } as any) : undefined,
    });

    // 3. Guardar en la base de datos
    try {
      return await this.estudianteRepository.save(nuevoEstudiante);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  private handleDBExceptions(error: any): never {
    if (error.code === '23505') {
      const detail: string = error.detail || '';

      if (detail.includes('documento')) {
        throw new ConflictException(
          'El número de documento ya se encuentra registrado.',
        );
      }
      if (detail.includes('nfcUid')) {
        throw new ConflictException(
          'La tarjeta NFC (UID) ingresada ya pertenece a otro estudiante.',
        );
      }
      if (detail.includes('qrTokenMaster')) {
        throw new ConflictException(
          'El token QR maestro generado ya pertenece a otro estudiante.',
        );
      }

      throw new ConflictException('Ya existe un registro con esos datos únicos.');
    }

    console.error('Error no controlado al guardar estudiante:', error);
    throw new InternalServerErrorException(
      'Ocurrió un error inesperado al registrar el estudiante.',
    );
  }
}