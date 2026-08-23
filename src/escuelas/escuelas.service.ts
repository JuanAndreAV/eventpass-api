import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escuela } from './entities/escuela.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { CreateEscuelaDto } from './dto/create-escuela.dto';
import { UpdateEscuelaDto } from './dto/update-escuela.dto';

@Injectable()
export class EscuelasService {
  constructor(
    @InjectRepository(Escuela)
    private readonly escuelaRepo: Repository<Escuela>,
  ) {}

  async create(dto: CreateEscuelaDto): Promise<Escuela> {
  const { directorId, apoyoAdministrativoId, formadoresIds, codigo, ...rest } = dto;

  const escuela = this.escuelaRepo.create({
    ...rest,
    codigo: codigo ?? (await this.generarCodigoUnico(rest.nombre)),
    director: directorId ? ({ id: directorId } as Usuario) : null,
    apoyoAdministrativo: apoyoAdministrativoId ? ({ id: apoyoAdministrativoId } as Usuario) : null,
    formadores: formadoresIds ? formadoresIds.map((id) => ({ id } as Usuario)) : [],
  });

  return await this.escuelaRepo.save(escuela);
}

private async generarCodigoUnico(nombre: string): Promise<string> {
  const base = nombre
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);

  let candidato = base;
  let sufijo = 1;

  while (await this.escuelaRepo.exists({ where: { codigo: candidato } })) {
    candidato = `${base}${sufijo++}`;
  }

  return candidato;
}

  async findAll(): Promise<Escuela[]> {
    return await this.escuelaRepo.find({
      relations: {
        director: true,
        apoyoAdministrativo: true,
        formadores: true,
      },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Escuela> {
    const escuela = await this.escuelaRepo.findOne({
      where: { id },
      relations: {
        director: true,
        apoyoAdministrativo: true,
        formadores: true,
        estudiantes: true,
      },
    });

    if (!escuela) {
      throw new NotFoundException(`La escuela con ID ${id} no existe`);
    }

    return escuela;
  }

  async update(id: string, dto: UpdateEscuelaDto): Promise<Escuela> {
    const { directorId, apoyoAdministrativoId, formadoresIds, ...rest } = dto;

    const escuela = await this.findOne(id);

    Object.assign(escuela, rest);

    if (directorId !== undefined) {
      escuela.director = directorId ? ({ id: directorId } as any) : null;
    }

    if (apoyoAdministrativoId !== undefined) {
      escuela.apoyoAdministrativo = apoyoAdministrativoId
        ? ({ id: apoyoAdministrativoId } as any)
        : null;
    }

    if (formadoresIds !== undefined) {
      escuela.formadores = formadoresIds.map((fId) => ({ id: fId } as any));
    }

    return await this.escuelaRepo.save(escuela);
  }
  async removeEscuela(id: string) {
  const escuela = await this.escuelaRepo.findOne({
    where: { id },
  });

  if (!escuela) {
    throw new NotFoundException(`La escuela con ID ${id} no existe`);
  }

  await this.escuelaRepo.delete(id);

  return {
    message: `La escuela "${escuela.nombre}" fue eliminada correctamente`,
    id,
  };
}
}