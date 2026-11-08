import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
// Ajusta las rutas de import a tu estructura
import { Rol } from '../../rol/entities/rol.entity';
import { EquipoAsignacion } from '../entities/equipo_asignacion.entity';

@Entity('cargos')
export class Cargo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  nombre: string;

  // coordinacion | agrupacion | escuela | formacion | lutheria | administrativo
  // | produccion | social | conocimiento | tic
  @Column({ type: 'varchar' })
  categoria: string;

  @Column({ name: 'requiere_escuela', type: 'boolean', default: false })
  requiereEscuela: boolean;

  @ManyToOne(() => Rol, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rol_defecto_id' })
  rolDefecto: Rol | null;

  @OneToMany(() => EquipoAsignacion, (a) => a.cargo)
  asignaciones: EquipoAsignacion[];
}