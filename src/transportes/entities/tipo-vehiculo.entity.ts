import {
  Column, CreateDateColumn, Entity, Index, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Tarifa } from './tarifa.entity';

@Entity('transporte_tipos_vehiculo')
export class TipoVehiculo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ type: 'int', name: 'puestos_min' })
  puestosMin: number;

  @Column({ type: 'int', name: 'puestos_max' })
  puestosMax: number;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Tarifa, (tarifa) => tarifa.tipoVehiculo)
  tarifas: Tarifa[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
