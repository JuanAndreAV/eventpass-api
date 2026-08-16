import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Asistente } from '../../asistentes/entities/asistente.entity';
import { Evento } from '../../eventos/entities/evento.entity';

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

  @ManyToOne(() => Asistente, (asistente) => asistente.accesosLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asistente_id' })
  asistente: Asistente;

  @ManyToOne(() => Evento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  @Column({ type: 'enum', enum: MetodoLectura })
  metodoLectura: MetodoLectura;

  @Column({ nullable: true })
  operadorId: string;

  @Column({ type: 'timestamp' })
  fechaEscaneo: Date;

  @CreateDateColumn()
  registradoEnServidor: Date;
}