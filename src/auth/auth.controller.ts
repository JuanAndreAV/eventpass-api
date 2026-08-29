import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express'; // 👈 Agregado 'type'
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, usuario } = await this.authService.login(dto);
const isProduction = process.env.NODE_ENV === 'production';
   res.cookie('jwt', token, {
  httpOnly: true,
  secure: isProduction,                             // true en Producción (requiere HTTPS)
  sameSite: isProduction ? 'none' : 'lax',          // 'none' permite peticiones cross-site en producción
  maxAge: 1000 * 60 * 60 * 8,                       // 8 horas
  path: '/',                                        // Asegura que la cookie esté disponible en todas las rutas de la API
});

    return {
      mensaje: 'Inicio de sesión exitoso',
      usuario,
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) { // 👈 Cambiado express.Response por Response
    res.clearCookie('jwt');
    return { mensaje: 'Sesión cerrada correctamente' };
  }
 

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) { // 👈 Cambiado express.Request por Request
    return req.user;
  }
}