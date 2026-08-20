import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
   if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado');
  }
  super({
    jwtFromRequest: ExtractJwt.fromExtractors([
      (request: Request) => request?.cookies?.jwt || null,
    ]),
    ignoreExpiration: false,
    secretOrKey: process.env.JWT_SECRET,
  });
  }

  async validate(payload: any) {
    if (!payload) {
      throw new UnauthorizedException('Token no válido o expirado');
    }
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}