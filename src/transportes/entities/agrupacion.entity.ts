import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToMany, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Ciclo } from './ciclo.entity';
import { Ruta } from './ruta.entity';

@Entity('transporte_agrupaciones')
export class Agrupacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 150 })
  nombre: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  codigo: string;

  // El Ensamble Neuro viaja dentro de la ruta regular de su escuela pero se baja
  // en otro punto, y debe verse marcado distinto en el listado de la ruta.
  @Column({ length: 200, nullable: true, name: 'destino_especial' })
  destinoEspecial?: string;

  @Column({ default: false, name: 'requiere_marca_distintiva' })
  requiereMarcaDistintiva: boolean;

  // El Ensamble Neuro puede viajar con un acompañante, que ocupa un puesto más.
  // Es un atributo de la agrupación y no código especial, igual que el destino.
  @Column({ default: false, name: 'permite_acompanante' })
  permiteAcompanante: boolean;

  // Ruta propia de la agrupación (p. ej. el Coro Inicial viaja en la Ruta 11 sin
  // importar su escuela). Cuando está definida, manda sobre la ruta de la escuela.
  @ManyToOne(() => Ruta, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ruta_id' })
  ruta?: Ruta | null;

  @Column({ default: true })
  activa: boolean;

  @ManyToMany(() => Ciclo, (ciclo) => ciclo.agrupaciones)
  ciclos: Ciclo[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
