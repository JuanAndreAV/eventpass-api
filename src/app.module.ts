import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccesosModule } from './accesos/accesos.module';
import { AsistentesModule } from './asistentes/asistentes.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { EscuelasModule } from './escuelas/escuelas.module';
import { EstudiantesModule } from './estudiantes/estudiantes.module';
import { EventosModule } from './eventos/eventos.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AccesosModule, AsistentesModule, EscuelasModule, EstudiantesModule, EventosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
