import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Agrupacion } from './agrupacion.entity';
import { Ciclo } from './ciclo.entity';
import { Instrumento } from './instrumento.entity';

export enum EstadoSolicitud {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

@Entity('transporte_solicitudes')
@Index('UQ_solicitud_ciclo_estudiante', ['ciclo', 'estudiante'], { unique: true })
export class Solicitud {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ciclo, (ciclo) => ciclo.solicitudes, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ciclo_id' })
  ciclo: Ciclo;

  @ManyToOne(() => Estudiante, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;

  // Escuela a la que pertenece: define qué secretaria aprueba la solicitud.
  @ManyToOne(() => Escuela, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;

  @ManyToOne(() => Agrupacion, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agrupacion_id' })
  agrupacion: Agrupacion;

  @Column({ default: false, name: 'lleva_instrumento' })
  llevaInstrumento: boolean;

  @ManyToOne(() => Instrumento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instrumento_id' })
  instrumento?: Instrumento | null;

  // Solo lo admiten las agrupaciones con `permiteAcompanante`. Suma un puesto.
  @Column({ default: false, name: 'lleva_acompanante' })
  llevaAcompanante: boolean;

  @Column({ default: false, name: 'requiere_ida' })
  requiereIda: boolean;

  // Puede ser distinta a la escuela de pertenencia: es un caso normal, no una excepción.
  @ManyToOne(() => Escuela, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'escuela_salida_id' })
  escuelaSalida?: Escuela | null;

  @Column({ default: false, name: 'requiere_regreso' })
  requiereRegreso: boolean;

  @ManyToOne(() => Escuela, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'escuela_llegada_id' })
  escuelaLlegada?: Escuela | null;

  @Column({ length: 20, nullable: true, name: 'telefono_contacto' })
  telefonoContacto?: string;

  @Column({ length: 20, nullable: true, name: 'telefono_acudiente' })
  telefonoAcudiente?: string;

  @Column({ type: 'text', nullable: true })
  observacion?: string;

  @Column({ type: 'enum', enum: EstadoSolicitud, default: EstadoSolicitud.PENDIENTE })
  estado: EstadoSolicitud;

  @Column({ type: 'text', nullable: true, name: 'motivo_rechazo' })
  motivoRechazo?: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'revisada_por_id' })
  revisadaPor?: Usuario | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'revisada_en' })
  revisadaEn?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
