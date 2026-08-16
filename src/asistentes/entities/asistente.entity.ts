import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Evento } from '../../eventos/entities/evento.entity';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { AccesoLog } from '../../acceso-log/entities/acceso-log.entity';

export enum TipoAsistente {
  ESTUDIANTE = 'ESTUDIANTE',
  RED = 'RED',
  EXTERNO = 'EXTERNO',
}

@Entity('asistentes')
@Index(['documento', 'evento'], { unique: true }) // Garantiza 1 sola inscripción por cédula por evento
export class Asistente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Evento, (evento) => evento.asistentes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  @Index()
  @Column()
  documento: string;

  @Column()
  nombreCompleto: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ type: 'enum', enum: TipoAsistente, default: TipoAsistente.EXTERNO })
  tipo: TipoAsistente;

  @ManyToOne(() => Estudiante, (estudiante) => estudiante.asistencias, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante?: Estudiante;

  @Column({ unique: true, nullable: true })
  qrToken: string;

  @Column({ default: false })
  ingresado: boolean;

  @Column({ type: 'timestamp', nullable: true })
  fechaIngreso: Date;

  @OneToMany(() => AccesoLog, (log) => log.asistente)
  accesosLogs: AccesoLog[];

  @CreateDateColumn()
  fechaInscripcion: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
