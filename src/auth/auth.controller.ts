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

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
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