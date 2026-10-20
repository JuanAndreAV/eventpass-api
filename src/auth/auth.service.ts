import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.findByEmailWithPassword(dto.email);

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (await this.usuariosService.estaBloqueado(usuario)) {
      throw new UnauthorizedException(
        'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta de nuevo en unos minutos.',
      );
    }

    const esPasswordValido = await bcrypt.compare(dto.password, usuario.password);
    if (!esPasswordValido) {
      await this.usuariosService.registrarIntentoFallido(usuario);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.usuariosService.registrarLoginExitoso(usuario);

    const rolesCodigos = usuario.roles ? usuario.roles.map((r) => r.codigo) : [];

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      roles: rolesCodigos,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        roles: rolesCodigos,
      },
    };
  }
}