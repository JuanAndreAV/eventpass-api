import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';

// El refresh token es más largo que el access token (1h, ver auth.module.ts)
// precisamente para no tener que volver a pedir usuario/contraseña cada hora.
const REFRESH_EXPIRES_IN = '7d';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

interface TokensEmitidos {
  accessToken: string;
  refreshToken: string;
  usuario: { id: string; email: string; nombres: string; apellidos: string; roles: string[] };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<TokensEmitidos> {
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

    return this.emitirTokens(usuario);
  }

  // Rota el refresh token en cada uso (uno nuevo invalida el anterior): así,
  // si alguien llega a copiar un refresh token viejo (ej. de un backup o un
  // log), deja de servir en cuanto el dueño real vuelva a refrescar.
  async refrescar(refreshToken: string): Promise<TokensEmitidos> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const usuario = await this.usuariosService.buscarPorIdConRefreshToken(payload.sub);
    if (!usuario || !usuario.activo || !usuario.refreshTokenHash || !usuario.refreshTokenExpira) {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }
    if (usuario.refreshTokenExpira < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    // La firma/expiración del JWT ya se verificó arriba; esto además confirma
    // que es justo el último que se emitió (no uno rotado y reemplazado).
    // SHA-256 + comparación en tiempo constante, no bcrypt (ver el porqué en
    // usuarios.service.ts/guardarRefreshToken).
    const huellaGuardada = Buffer.from(usuario.refreshTokenHash);
    const huellaRecibida = Buffer.from(createHash('sha256').update(refreshToken).digest('hex'));
    // timingSafeEqual lanza si los buffers no tienen el mismo largo (en vez
    // de devolver false), así que el chequeo de longitud va primero.
    const coincide = huellaGuardada.length === huellaRecibida.length
      && timingSafeEqual(huellaGuardada, huellaRecibida);
    if (!coincide) {
      throw new UnauthorizedException('Refresh token inválido o vencido');
    }

    return this.emitirTokens(usuario);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, { ignoreExpiration: true });
      if (payload?.sub) await this.usuariosService.revocarRefreshToken(payload.sub);
    } catch {
      // Token ilegible/ajeno: no hay nada que revocar, y logout no debe fallar por esto.
    }
  }

  private async emitirTokens(usuario: Usuario): Promise<TokensEmitidos> {
    const rolesCodigos = usuario.roles ? usuario.roles.map((r) => r.codigo) : [];

    const accessToken = this.jwtService.sign({
      sub: usuario.id, email: usuario.email, roles: rolesCodigos,
    });
    const refreshToken = this.jwtService.sign(
      { sub: usuario.id, type: 'refresh', jti: randomUUID() },
      { expiresIn: REFRESH_EXPIRES_IN },
    );

    await this.usuariosService.guardarRefreshToken(
      usuario.id, refreshToken, new Date(Date.now() + REFRESH_EXPIRES_MS),
    );

    return {
      accessToken,
      refreshToken,
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
