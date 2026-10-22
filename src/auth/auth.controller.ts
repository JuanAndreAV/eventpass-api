import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express'; // 👈 Agregado 'type'
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const isProduction = process.env.NODE_ENV === 'production';

// Cookies base compartidas por access y refresh token; cada una ajusta su
// propio maxAge y path al llamar a res.cookie().
const COOKIE_BASE = {
  httpOnly: true,
  secure: isProduction,                    // true en producción (requiere HTTPS)
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax', // 'none' permite cross-site en producción
} as const;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, usuario } = await this.authService.login(dto);
    this.setCookies(res, accessToken, refreshToken);

    return {
      mensaje: 'Inicio de sesión exitoso',
      usuario,
    };
  }

  // Sin guard a propósito: el punto de este endpoint es renovar el access
  // token cuando YA venció, así que no puede exigir uno válido. Se autentica
  // solo con la cookie refresh_token (separada de "jwt").
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('No hay sesión para renovar');

    const { accessToken, refreshToken: nuevoRefreshToken, usuario } =
      await this.authService.refrescar(refreshToken);
    this.setCookies(res, accessToken, nuevoRefreshToken);

    return { usuario };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.refresh_token);
    res.clearCookie('jwt', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { mensaje: 'Sesión cerrada correctamente' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) { // 👈 Cambiado express.Request por Response
    return req.user;
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('jwt', accessToken, {
      ...COOKIE_BASE,
      maxAge: 1000 * 60 * 60,              // 1 hora, igual que el expiresIn del access token
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_BASE,
      maxAge: 1000 * 60 * 60 * 24 * 7,     // 7 días, igual que el expiresIn del refresh token
      // Solo se manda a los endpoints de auth: si algún día otro endpoint
      // tiene una fuga que exponga cookies, esta ni siquiera llega ahí.
      path: '/api/v1/eventpass/auth',
    });
  }
}
