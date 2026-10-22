// equipo-interno/equipo-interno.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEquipoInternoDto, UpdateEquipoInternoDto } from './dto/equipo-interno.dto';
import { CreateVinculacionDto, UpdateVinculacionDto } from './dto/vinculacion.dto';
import { Cargo } from './entities/cargo.entity';
import { ContratoInteradministrativo } from './entities/contrato-interadministrativo.entity';
import { EquipoInterno } from './entities/equipo-interno.entity';
import { Justificacion } from './entities/justificacion.entity';
import { ObjetoContrato } from './entities/objeto-contrato.entity';
import { PerfilFuncion } from './entities/perfil-funcion.entity';
import { Vinculacion } from './entities/vinculacion.entity';

@Injectable()
export class EquipoInternoService {
  constructor(
    @InjectRepository(EquipoInterno) private readonly personaRepo: Repository<EquipoInterno>,
    @InjectRepository(Vinculacion) private readonly vinculacionRepo: Repository<Vinculacion>,
    @InjectRepository(Cargo) private readonly cargoRepo: Repository<Cargo>,
    @InjectRepository(ContratoInteradministrativo)
    private readonly contratoRepo: Repository<ContratoInteradministrativo>,
    @InjectRepository(ObjetoContrato) private readonly objetoContratoRepo: Repository<ObjetoContrato>,
    @InjectRepository(Justificacion) private readonly justificacionRepo: Repository<Justificacion>,
    @InjectRepository(PerfilFuncion) private readonly perfilFuncionRepo: Repository<PerfilFuncion>,
  ) {}

  // Lo usa inscripcion-red.service.ts para la categoría EQUIPO_INTERNO: si el
  // documento no está aquí (y activo), no se le puede asignar esa categoría
  // solo porque eligió ese rol en el formulario público.
  async existeActivo(documento: string): Promise<boolean> {
    return this.personaRepo.exists({ where: { documento, activo: true } });
  }

  async findAll(): Promise<EquipoInterno[]> {
    return this.personaRepo.find({
      relations: { vinculaciones: true },
      order: { nombreCompleto: 'ASC' },
    });
  }

  async findOne(id: string): Promise<EquipoInterno> {
    const persona = await this.personaRepo.findOne({
      where: { id },
      relations: {
        vinculaciones: {
          contratoInteradministrativo: true, objetoContrato: true,
          justificacion: true, perfilFuncion: true,
        },
      },
    });
    if (!persona) throw new NotFoundException(`No existe una persona de equipo interno con ID ${id}`);
    return persona;
  }

  async create(dto: CreateEquipoInternoDto): Promise<EquipoInterno> {
    const persona = this.personaRepo.create(dto);
    return this.personaRepo.save(persona);
  }

  async update(id: string, dto: UpdateEquipoInternoDto): Promise<EquipoInterno> {
    const persona = await this.findOne(id);
    Object.assign(persona, dto);
    await this.personaRepo.save(persona);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const persona = await this.findOne(id);
    await this.personaRepo.remove(persona);
    return { mensaje: 'Persona de equipo interno eliminada' };
  }

  async crearVinculacion(dto: CreateVinculacionDto): Promise<Vinculacion> {
    const persona = await this.findOne(dto.personaId);
    const cargo = await this.cargoRepo.findOneByOrFail({ id: dto.cargoId });
    const contrato = await this.contratoRepo.findOneByOrFail({ id: dto.contratoInteradministrativoId });

    const vinculacion = this.vinculacionRepo.create({
      persona, cargo, contratoInteradministrativo: contrato,
      objetoContrato: dto.objetoContratoId ? { id: dto.objetoContratoId } as ObjetoContrato : null,
      justificacion: dto.justificacionId ? { id: dto.justificacionId } as Justificacion : null,
      perfilFuncion: dto.perfilFuncionId ? { id: dto.perfilFuncionId } as PerfilFuncion : null,
      grupo: dto.grupo,
      tipoVinculacion: dto.tipoVinculacion,
      dedicacion: dto.dedicacion ?? null,
      formaPago: dto.formaPago ?? null,
      fechaInicio: dto.fechaInicio ?? null,
      fechaFin: dto.fechaFin ?? null,
      monto: dto.monto ?? null,
      horario: dto.horario ?? null,
      estadoVinculacion: dto.estadoVinculacion,
    });
    return this.vinculacionRepo.save(vinculacion);
  }

  async actualizarVinculacion(id: string, dto: UpdateVinculacionDto): Promise<Vinculacion> {
    const vinculacion = await this.vinculacionRepo.findOne({ where: { id } });
    if (!vinculacion) throw new NotFoundException(`No existe la vinculación con ID ${id}`);

    if (dto.cargoId) vinculacion.cargo = await this.cargoRepo.findOneByOrFail({ id: dto.cargoId });
    if (dto.contratoInteradministrativoId) {
      vinculacion.contratoInteradministrativo =
        await this.contratoRepo.findOneByOrFail({ id: dto.contratoInteradministrativoId });
    }
    if (dto.objetoContratoId !== undefined) {
      vinculacion.objetoContrato = dto.objetoContratoId ? { id: dto.objetoContratoId } as ObjetoContrato : null;
    }
    if (dto.justificacionId !== undefined) {
      vinculacion.justificacion = dto.justificacionId ? { id: dto.justificacionId } as Justificacion : null;
    }
    if (dto.perfilFuncionId !== undefined) {
      vinculacion.perfilFuncion = dto.perfilFuncionId ? { id: dto.perfilFuncionId } as PerfilFuncion : null;
    }
    if (dto.grupo !== undefined) vinculacion.grupo = dto.grupo;
    if (dto.tipoVinculacion !== undefined) vinculacion.tipoVinculacion = dto.tipoVinculacion;
    if (dto.dedicacion !== undefined) vinculacion.dedicacion = dto.dedicacion ?? null;
    if (dto.formaPago !== undefined) vinculacion.formaPago = dto.formaPago ?? null;
    if (dto.fechaInicio !== undefined) vinculacion.fechaInicio = dto.fechaInicio ?? null;
    if (dto.fechaFin !== undefined) vinculacion.fechaFin = dto.fechaFin ?? null;
    if (dto.monto !== undefined) vinculacion.monto = dto.monto ?? null;
    if (dto.horario !== undefined) vinculacion.horario = dto.horario ?? null;
    if (dto.estadoVinculacion !== undefined) vinculacion.estadoVinculacion = dto.estadoVinculacion;

    return this.vinculacionRepo.save(vinculacion);
  }

  // Catálogos de referencia para armar los formularios del admin.
  findAllCargos(): Promise<Cargo[]> {
    return this.cargoRepo.find({ order: { nombre: 'ASC' } });
  }

  findAllContratos(): Promise<ContratoInteradministrativo[]> {
    return this.contratoRepo.find({ order: { anio: 'DESC' } });
  }

  findAllObjetosContrato(): Promise<ObjetoContrato[]> {
    return this.objetoContratoRepo.find();
  }

  findAllJustificaciones(): Promise<Justificacion[]> {
    return this.justificacionRepo.find();
  }

  findAllPerfilesFuncion(): Promise<PerfilFuncion[]> {
    return this.perfilFuncionRepo.find();
  }
}
