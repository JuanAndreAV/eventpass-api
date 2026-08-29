import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, OneToMany, CreateDateColumn,
} from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Asistente } from '../../asistentes/entities/asistente.entity';
import { AccesoLog } from '../../acceso-log/entities/acceso-log.entity';

export enum TipoEvento {
  CONCIERTO = 'CONCIERTO',
  CONFERENCIA = 'CONFERENCIA',
  EXPOSICION = 'EXPOSICION',
  TEATRO = 'TEATRO',
  CONGRESO = 'CONGRESO',
  FESTIVAL = 'FESTIVAL',
  MASTERCLASS = 'MASTERCLASS',
  SEMINARIO = 'SEMINARIO',
  TALLER = 'TALLER',
  INSTITUCIONAL = 'INSTITUCIONAL',
  ASISTENCIA_ESCOLAR = 'ASISTENCIA_ESCOLAR',
  OTRO = 'OTRO',
}
@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'enum', enum: TipoEvento, default: TipoEvento.INSTITUCIONAL })
  tipo: TipoEvento;

  // Nullable: si es null, es un evento de alcance general (no ligado a una escuela específica)
  @ManyToOne(() => Escuela, (escuela) => escuela.eventos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'escuela_id' })
  escuela?: Escuela;

  @Column({ type: 'int', nullable: true })
  aforoMaximo?: number;

  @Column({ type: 'timestamptz' })
  fechaInicio: Date;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Asistente, (asistente) => asistente.evento)
  asistentes: Asistente[];

  @OneToMany(() => AccesoLog, (log) => log.evento)
  accesosLogs: AccesoLog[];

  @CreateDateColumn()
  creadoEn: Date;
}