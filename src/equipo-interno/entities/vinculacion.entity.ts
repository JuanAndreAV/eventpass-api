// equipo-interno/entities/vinculacion.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Cargo, GrupoCargo } from './cargo.entity';
import { ContratoInteradministrativo } from './contrato-interadministrativo.entity';
import { EquipoInterno } from './equipo-interno.entity';
import { Justificacion } from './justificacion.entity';
import { ObjetoContrato } from './objeto-contrato.entity';
import { PerfilFuncion } from './perfil-funcion.entity';

export enum TipoVinculacion {
  LABORAL = 'LABORAL',
  PRESTACION_SERVICIOS = 'PRESTACION_SERVICIOS',
}

export enum Dedicacion {
  TIEMPO_COMPLETO = 'TIEMPO_COMPLETO',
  MEDIO_TIEMPO = 'MEDIO_TIEMPO',
  TREINTA_HORAS = 'TREINTA_HORAS',
}

export enum FormaPago {
  QUINCENAL = 'QUINCENAL',
  MENSUAL = 'MENSUAL',
  PAGO_UNICO = 'PAGO_UNICO',
}

export enum EstadoVinculacion {
  ACTIVO = 'ACTIVO',
  PENDIENTE_CONTRATACION = 'PENDIENTE_CONTRATACION',
}

// Una persona puede tener más de una vinculación en el tiempo (otro contrato,
// otro cargo), por eso esto es su propia tabla y no columnas en EquipoInterno.
@Entity('equipo_vinculaciones')
// Para una importación idempotente (reimportar el mismo Excel no debe
// duplicar filas): mismo criterio que sugiere el JSON de origen.
@Index(['persona', 'contratoInteradministrativo', 'cargo', 'fechaInicio'], { unique: true })
export class Vinculacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EquipoInterno, (persona) => persona.vinculaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'persona_id' })
  persona: EquipoInterno;

  @ManyToOne(() => Cargo, { eager: true })
  @JoinColumn({ name: 'cargo_id' })
  cargo: Cargo;

  @ManyToOne(() => ContratoInteradministrativo)
  @JoinColumn({ name: 'contrato_interadministrativo_id' })
  contratoInteradministrativo: ContratoInteradministrativo;

  @ManyToOne(() => ObjetoContrato, { nullable: true })
  @JoinColumn({ name: 'objeto_contrato_id' })
  objetoContrato?: ObjetoContrato | null;

  @ManyToOne(() => Justificacion, { nullable: true })
  @JoinColumn({ name: 'justificacion_id' })
  justificacion?: Justificacion | null;

  @ManyToOne(() => PerfilFuncion, { nullable: true })
  @JoinColumn({ name: 'perfil_funcion_id' })
  perfilFuncion?: PerfilFuncion | null;

  // Redundante con cargo.grupo, pero el JSON de origen lo trata como un
  // atributo propio de la vinculación (p. ej. alguien podría tener un cargo
  // reclasificado sin que esta vinculación histórica cambie de grupo).
  @Column({ type: 'enum', enum: GrupoCargo })
  grupo: GrupoCargo;

  @Column({ type: 'enum', enum: TipoVinculacion, name: 'tipo_vinculacion' })
  tipoVinculacion: TipoVinculacion;

  @Column({ type: 'enum', enum: Dedicacion, nullable: true })
  dedicacion: Dedicacion | null;

  @Column({ type: 'enum', enum: FormaPago, nullable: true, name: 'forma_pago' })
  formaPago: FormaPago | null;

  @Column({ type: 'date', nullable: true, name: 'fecha_inicio' })
  fechaInicio: string | null;

  @Column({ type: 'date', nullable: true, name: 'fecha_fin' })
  fechaFin: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  monto: string | null;

  // Solo se usa en LABORAL_FORMACION según el JSON de origen (en
  // administrativo y PS esta columna viene vacía); se deja nullable para
  // ambos casos en vez de forzar un valor.
  @Column({ type: 'varchar', nullable: true, length: 100 })
  horario: string | null;

  @Column({ type: 'enum', enum: EstadoVinculacion, name: 'estado_vinculacion' })
  estadoVinculacion: EstadoVinculacion;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
