import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // 1. Importante: Inyecta UsuariosModule para dar acceso a UsuariosService
    UsuariosModule,
    
    // 2. Módulo de Passport para la estrategia JWT
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // 3. Configuración asíncrona del JWT leyendo la clave secreta del .env
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'secreto_desarrollo_medellin'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule, AuthService],
})
export class AuthModule {}