// asistentes/entities/asistente.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, Index, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Evento } from '../../eventos/entities/evento.entity';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { AccesoLog } from '../../acceso-log/entities/acceso-log.entity'; // 👈 nuevo import
import { TipoDocumento } from '../../common/entity/persona-base.entity';

export enum TipoAsistente {
  ESTUDIANTE = 'ESTUDIANTE',
  RED = 'RED',
  EXTERNO = 'EXTERNO',
}

// Antes vivían en inscripcion-red/entities/inscripcion-red.entity.ts (tabla
// propia "inscripciones_red"): se unificó todo en "asistentes" para que las
// inscripciones por red también puedan tener QR y pasar por el escáner del
// día del evento (accesos_log), que solo conoce Asistente — ver migración
// MigrarInscripcionesRedAAsistentes.
export enum RedPrograma {
  MUSICA = 'MUSICA',
  RPAC = 'RPAC',
}

export enum CategoriaInscripcionRed {
  NINOS_MUSICA = 'NINOS_MUSICA',
  JOVENES_MUSICA = 'JOVENES_MUSICA',
  LABORATORIO_RED = 'LABORATORIO_RED',
  RPAC = 'RPAC',
  EQUIPO_INTERNO = 'EQUIPO_INTERNO',
}

@Entity('asistentes')
@Index(['documento', 'evento'], { unique: true })
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

  @Column({ type: 'varchar', nullable: true })
email: string | null;

@Column({ type: 'varchar', nullable: true })
telefono: string | null;

  @Column({ type: 'enum', enum: TipoAsistente, default: TipoAsistente.EXTERNO })
  tipo: TipoAsistente;

  // Solo se llena para tipo=RED. tipo_documento no existía antes porque el
  // flujo general (ESTUDIANTE/EXTERNO) nunca pidió el tipo de documento.
  @Column({ type: 'enum', enum: TipoDocumento, nullable: true, name: 'tipo_documento' })
  tipoDocumento: TipoDocumento | null;

  @Column({ type: 'enum', enum: RedPrograma, nullable: true })
  red: RedPrograma | null;

  // String libre (no enum de Postgres): el conjunto válido depende de `red`
  // y se valida en el DTO/service de inscripcion-red, igual que antes.
  @Column({ type: 'varchar', nullable: true, length: 50 })
  rol: string | null;

  @Column({ type: 'varchar', nullable: true, length: 150, name: 'rol_otro' })
  rolOtro: string | null;

  @Column({ type: 'enum', enum: CategoriaInscripcionRed, nullable: true })
  categoria: CategoriaInscripcionRed | null;

  // Texto libre (no es la relación con Escuela): para EQUIPO_INTERNO es un
  // rótulo fijo ("Equipo interno — Red de Músicas"), para el resto de roles
  // de red lo escribe la persona misma en el formulario.
  @Column({ type: 'varchar', nullable: true, length: 150 })
  escuela: string | null;

  // Nullable: equipo interno no tiene fecha de nacimiento registrada y no la
  // necesita para nada (solo se usa para el tramo NINOS/JOVENES música).
  @Column({ type: 'int', nullable: true })
  edad: number | null;

  @Column({ type: 'varchar', nullable: true, length: 150, name: 'nombre_acudiente' })
  nombreAcudiente: string | null;

  @ManyToOne(() => Estudiante, (estudiante) => estudiante.asistencias, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante?: Estudiante;

  @Column({ type: 'text', unique: true, nullable: true }) // ajustado a TEXT por la migración #6
  qrToken: string;

  @Column({ default: false })
  ingresado: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  fechaIngreso: Date;

  @OneToMany(() => AccesoLog, (log) => log.asistente) // 👈 la relación que faltaba
  accesosLogs: AccesoLog[];

  @CreateDateColumn({ type: 'timestamptz' })
  fechaInscripcion: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadoEn: Date;
}