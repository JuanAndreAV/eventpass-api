import {
  Column, CreateDateColumn, Entity, Index, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Ruta } from './ruta.entity';
import { Tarifa } from './tarifa.entity';

@Entity('transporte_zonas')
export class Zona {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => Ruta, (ruta) => ruta.zona)
  rutas: Ruta[];

  @OneToMany(() => Tarifa, (tarifa) => tarifa.zona)
  tarifas: Tarifa[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
