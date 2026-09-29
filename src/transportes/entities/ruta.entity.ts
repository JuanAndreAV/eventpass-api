import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Zona } from './zona.entity';
import { EscuelaRuta } from './escuela-ruta.entity';

// Casi toda ruta hace ida y regreso con el mismo vehículo; lo que varía es qué
// trayectos pide cada estudiante. La excepción son las rutas marcadas `soloIda`,
// que hacen un único recorrido (R11 - Coro Inicial).
@Entity('transporte_rutas')
export class Ruta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  codigo: string;

  @ManyToOne(() => Zona, (zona) => zona.rutas, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zona_id' })
  zona: Zona;

  // La ruta hace un único recorrido: no admite trayecto de regreso.
  @Column({ default: false, name: 'solo_ida' })
  soloIda: boolean;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => EscuelaRuta, (mapeo) => mapeo.ruta)
  escuelas: EscuelaRuta[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
