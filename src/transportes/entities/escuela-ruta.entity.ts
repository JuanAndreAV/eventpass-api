import {
  CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Ruta } from './ruta.entity';

// Tabla puente en vez de un FK en "escuelas": el catálogo de escuelas lo comparte
// el módulo de control de acceso y no debe cargar con conceptos de transporte.
@Entity('transporte_escuela_ruta')
export class EscuelaRuta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @ManyToOne(() => Escuela, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;

  @ManyToOne(() => Ruta, (ruta) => ruta.escuelas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Ruta;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
