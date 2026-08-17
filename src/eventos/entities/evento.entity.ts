import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Asistente } from '../../asistentes/entities/asistente.entity';

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
  OTRO = 'OTRO',
  
}

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'enum', enum: TipoEvento, default: TipoEvento.INSTITUCIONAL })
  tipo: TipoEvento;

  // NULLABLE: Si es NULL, se considera un evento de alcance INSTITUCIONAL / GLOBAL
  @ManyToOne(() => Escuela, (escuela) => escuela.eventos, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'escuela_id' })
  escuela?: Escuela;

  @Column({ type: 'int', nullable: true })
  aforoMaximo: number;

  @Column({ type: 'timestamp' })
  fechaInicio: Date;

  

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Asistente, (asistente) => asistente.evento)
  asistentes: Asistente[];

  @CreateDateColumn()
  creadoEn: Date;
}
