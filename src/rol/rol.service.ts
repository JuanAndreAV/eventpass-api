// roles.service.ts
import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from './entities/rol.entity';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Injectable()
export class RolService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
  ) {}

  async create(dto: CreateRolDto): Promise<Rol> {
    const existente = await this.rolRepo.findOneBy({ codigo: dto.codigo });
    if (existente) {
      throw new ConflictException(`Ya existe un rol con el código "${dto.codigo}"`);
    }
    return this.rolRepo.save(this.rolRepo.create(dto));
  }

  findAll(): Promise<Rol[]> {
    return this.rolRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: string): Promise<Rol> {
    const rol = await this.rolRepo.findOneBy({ id });
    if (!rol) throw new NotFoundException(`El rol con ID ${id} no existe`);
    return rol;
  }

  async findByCodigo(codigo: string): Promise<Rol> {
    const rol = await this.rolRepo.findOneBy({ codigo });
    if (!rol) throw new NotFoundException(`El rol "${codigo}" no existe`);
    return rol;
  }

  async update(id: string, dto: UpdateRolDto): Promise<Rol> {
    const rol = await this.findOne(id);
    Object.assign(rol, dto);
    return this.rolRepo.save(rol);
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const rol = await this.findOne(id);
    await this.rolRepo.remove(rol);
    return { mensaje: `Rol "${rol.nombre}" eliminado correctamente` };
  }
}