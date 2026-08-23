// usuarios.service.ts
import {
  ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/update-usuario.dto';
import { RolService } from '../rol/rol.service';

const SALT_ROUNDS = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly rolesService: RolService,
  ) {}

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const { rolesCodigos, password, ...datos } = dto;

    const roles = await Promise.all(
      rolesCodigos.map((codigo) => this.rolesService.findByCodigo(codigo)),
    );

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const nuevoUsuario = this.usuarioRepository.create({
      ...datos,
      password: passwordHash,
      roles,
    });

    try {
      const guardado = await this.usuarioRepository.save(nuevoUsuario);
      return this.findOne(guardado.id); // recarga sin password
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuarioRepository.find({
      relations: { roles: true },
      order: { nombres: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!usuario) throw new NotFoundException(`El usuario con ID ${id} no existe`);
    return usuario;
  }

  // Usado por AuthService en el login — sí incluye password
  async findByEmailWithPassword(email: string): Promise<Usuario | null> {
    return this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .leftJoinAndSelect('usuario.roles', 'roles')
      .where('usuario.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const { rolesCodigos, ...datos } = dto;
    const usuario = await this.findOne(id);

    Object.assign(usuario, datos);

    if (rolesCodigos !== undefined) {
      usuario.roles = await Promise.all(
        rolesCodigos.map((codigo) => this.rolesService.findByCodigo(codigo)),
      );
    }

    try {
      await this.usuarioRepository.save(usuario);
      return this.findOne(id);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .where('usuario.id = :id', { id })
      .getOne();

    if (!usuario) throw new NotFoundException(`El usuario con ID ${id} no existe`);

    const coincide = await bcrypt.compare(dto.passwordActual, usuario.password);
    if (!coincide) throw new ForbiddenException('La contraseña actual no es correcta');

    usuario.password = await bcrypt.hash(dto.passwordNueva, SALT_ROUNDS);
    await this.usuarioRepository.save(usuario);

    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  async desactivar(id: string): Promise<Usuario> {
    const usuario = await this.findOne(id);
    usuario.activo = false;
    await this.usuarioRepository.save(usuario);
    return usuario;
  }

  async remove(id: string): Promise<{ mensaje: string }> {
    const usuario = await this.findOne(id);
    await this.usuarioRepository.remove(usuario);
    return { mensaje: `Usuario "${usuario.nombres} ${usuario.apellidos}" eliminado` };
  }

  private handleDBExceptions(error: any): never {
    if (error.code === '23505') {
      const detail: string = error.detail || '';
      if (detail.includes('documento')) {
        throw new ConflictException('El documento ya está registrado.');
      }
      if (detail.includes('email')) {
        throw new ConflictException('El email ya está registrado.');
      }
      throw new ConflictException('Ya existe un registro con esos datos únicos.');
    }
    console.error('Error no controlado en usuarios:', error);
    throw new InternalServerErrorException('Ocurrió un error inesperado.');
  }
}