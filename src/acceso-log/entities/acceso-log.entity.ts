import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Asistente } from '../../asistentes/entities/asistente.entity';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Evento } from '../../eventos/entities/evento.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum MetodoLectura {
  QR = 'QR',
  CEDULA_PDF417 = 'CEDULA_PDF417',
  NFC = 'NFC',
  MANUAL = 'MANUAL',
}

@Entity('accesos_log')
export class AccesoLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Solo se llena cuando el acceso es a un evento con inscripción (concierto, etc.)
  @ManyToOne(() => Asistente, (asistente) => asistente.accesosLogs, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asistente_id' })
  asistente?: Asistente;

  // Se llena cuando el acceso es de un estudiante identificado por NFC/QR/documento
  @ManyToOne(() => Estudiante, (estudiante) => estudiante.accesoLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante?: Estudiante;

  // Siempre requerido: incluso la asistencia diaria a la escuela es un "evento"
  @ManyToOne(() => Evento, (evento) => evento.accesosLogs, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  // Vigilante/operador que registró el escaneo
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operador_id' })
  operador?: Usuario;

  @Column({ type: 'enum', enum: MetodoLectura, default: MetodoLectura.QR })
  metodoLectura: MetodoLectura;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
fechaEscaneo: Date;

@CreateDateColumn({ name: 'registrado_en_servidor', type: 'timestamptz' })
registradoEnServidor: Date;
}