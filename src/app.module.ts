import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AsistentesModule } from './asistentes/asistentes.module';
import { AccesoLogModule} from './acceso-log/acceso-log.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { EscuelasModule } from './escuelas/escuelas.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { EventosModule } from './eventos/eventos.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Escuela } from './escuelas/entities/escuela.entity';
import { Estudiante } from './estudiantes/entities/estudiante.entity';
import { Evento } from './eventos/entities/evento.entity';
import { Asistente } from './asistentes/entities/asistente.entity';
import { AccesoLog } from './acceso-log/entities/acceso-log.entity';


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
        username: config.get<string>('POSTGRES_USER', 'dev_user'),
        password: config.get<string>('POSTGRES_PASSWORD', 'dev_password'),
        database: config.get<string>('POSTGRES_DB', 'control_accesos_db'),
        entities: [Escuela, Estudiante, Evento, Asistente, AccesoLog],
        synchronize: true, //ojo:  para sincronizar esquemas automáticamente en entorno de desarrollo local cambiar a false en produccion
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
    AccesoLogModule, AsistentesModule, EscuelasModule, EstudiantesModule, EventosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
