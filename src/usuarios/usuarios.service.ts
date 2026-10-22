// usuarios.service.ts
import {
  ConflictException, ForbiddenException, Injectable,
  InternalServerErrorException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ChangePasswordDto } from './dto/update-usuario.dto';
import { RolService } from '../rol/rol.service';

const SALT_ROUNDS = 10;

// Mismo umbral que usa el checklist de bloqueo de cuenta de Windows/CIS:
// 5 intentos fallidos consecutivos, bloqueo de 30 minutos.
const MAX_INTENTOS_FALLIDOS = 5;
const DURACION_BLOQUEO_MS = 30 * 60 * 1000;

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
      .addSelect('usuario.intentosFallidos')
      .addSelect('usuario.bloqueadoHasta')
      .leftJoinAndSelect('usuario.roles', 'roles')
      .where('usuario.email = :email', { email })
      .getOne();
  }

  // true si ya está bloqueado (y no hace nada más); si el bloqueo ya venció,
  // lo limpia y devuelve false para dejar pasar el intento normalmente.
  async estaBloqueado(usuario: Usuario): Promise<boolean> {
    if (!usuario.bloqueadoHasta) return false;

    if (usuario.bloqueadoHasta > new Date()) return true;

    usuario.bloqueadoHasta = null;
    usuario.intentosFallidos = 0;
    await this.usuarioRepository.update(usuario.id, {
      bloqueadoHasta: null,
      intentosFallidos: 0,
    });
    return false;
  }

  async registrarIntentoFallido(usuario: Usuario): Promise<void> {
    const intentos = usuario.intentosFallidos + 1;
    const bloqueadoHasta =
      intentos >= MAX_INTENTOS_FALLIDOS ? new Date(Date.now() + DURACION_BLOQUEO_MS) : null;

    await this.usuarioRepository.update(usuario.id, {
      intentosFallidos: bloqueadoHasta ? 0 : intentos,
      bloqueadoHasta,
    });
  }

  async registrarLoginExitoso(usuario: Usuario): Promise<void> {
    if (usuario.intentosFallidos === 0 && !usuario.bloqueadoHasta) return;
    await this.usuarioRepository.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta: null });
  }

  // Trae también el hash del refresh token (select:false por defecto, igual
  // que la contraseña) para que AuthService.refrescar() pueda compararlo.
  async buscarPorIdConRefreshToken(id: string): Promise<Usuario | null> {
    return this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.refreshTokenHash')
      .addSelect('usuario.refreshTokenExpira')
      .leftJoinAndSelect('usuario.roles', 'roles')
      .where('usuario.id = :id', { id })
      .getOne();
  }

  // Un solo refresh token activo por usuario: guardar uno nuevo invalida el
  // anterior (tanto al rotar en cada refresh como al loguearse de nuevo).
  //
  // SHA-256 y no bcrypt: bcrypt trunca la entrada a 72 bytes, y un JWT es
  // mucho más largo que eso — dos refresh tokens del mismo usuario comparten
  // el mismo header y casi todo el payload (solo cambian jti/iat/exp al
  // final), así que sus primeros 72 bytes son idénticos y bcrypt los habría
  // tratado como "la misma" contraseña sin importar la firma real. Para un
  // token ya aleatorio (no una contraseña elegida por una persona) lo que
  // hace falta es una huella criptográfica sin ese límite, no una KDF lenta.
  async guardarRefreshToken(usuarioId: string, tokenPlano: string, expira: Date): Promise<void> {
    const hash = createHash('sha256').update(tokenPlano).digest('hex');
    await this.usuarioRepository.update(usuarioId, { refreshTokenHash: hash, refreshTokenExpira: expira });
  }

  async revocarRefreshToken(usuarioId: string): Promise<void> {
    await this.usuarioRepository.update(usuarioId, { refreshTokenHash: null, refreshTokenExpira: null });
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