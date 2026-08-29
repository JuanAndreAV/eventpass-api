import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AsistentesModule } from './asistentes/asistentes.module';
import { AccesoLogModule } from './acceso-log/acceso-log.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EscuelasModule } from './escuelas/escuelas.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { EventosModule } from './eventos/eventos.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Escuela } from './escuelas/entities/escuela.entity';
import { Estudiante } from './estudiantes/entities/estudiante.entity';
import { Evento } from './eventos/entities/evento.entity';
import { Asistente } from './asistentes/entities/asistente.entity';
import { AccesoLog } from './acceso-log/entities/acceso-log.entity';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { Usuario } from './usuarios/entities/usuario.entity';
import { RolModule } from './rol/rol.module';
import { ValidacionIdentidadModule } from './validacion-identidad/validacion-identidad.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'dev_password'),
        database: config.get<string>('DB_NAME', 'postgres'),
        autoLoadEntities: true,
        synchronize: false,
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        extra: {
    options: '-c timezone=-05:00', 
  },
      }),
    }),
    AccesoLogModule,
    AsistentesModule,
    EscuelasModule,
    EstudiantesModule,
    EventosModule,
    UsuariosModule,
    AuthModule,
    RolModule,
    ValidacionIdentidadModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
