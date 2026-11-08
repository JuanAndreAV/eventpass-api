import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
// Ajusta las rutas de import a tu estructura
import { EquipoInterno } from './equipo-interno.entity';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Cargo } from './cargo.entity';

// El índice único (persona_id, cargo_id, escuela_id) NULLS NOT DISTINCT
// vive solo en la migración: TypeORM no lo soporta por decorador.
@Entity('equipo_asignaciones')
export class EquipoAsignacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EquipoInterno, (p) => p.asignaciones, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'persona_id' })
  persona: EquipoInterno;

  @ManyToOne(() => Cargo, (c) => c.asignaciones, { nullable: false })
  @JoinColumn({ name: 'cargo_id' })
  cargo: Cargo;

  // null si el cargo no es de una escuela, o si aún no se ha asignado
  @ManyToOne(() => Escuela, { nullable: true })
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela | null;

  // bronces, maderas, MUTAR, vientos (asistencial)...
  @Column({ type: 'varchar', nullable: true })
  detalle: string | null;

  @Column({ type: 'boolean', default: true })
  principal: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}