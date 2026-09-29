import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Zona } from './zona.entity';
import { TipoVehiculo } from './tipo-vehiculo.entity';

// El costo de una ruta sale de cruzar su zona con el tipo de vehículo requerido.
@Entity('transporte_tarifas')
@Index('UQ_tarifa_zona_vehiculo_vigencia', ['zona', 'tipoVehiculo', 'vigenteDesde'], { unique: true })
export class Tarifa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Zona, (zona) => zona.tarifas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zona_id' })
  zona: Zona;

  @ManyToOne(() => TipoVehiculo, (tipo) => tipo.tarifas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipo_vehiculo_id' })
  tipoVehiculo: TipoVehiculo;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  valor: string;

  @Column({ type: 'date', name: 'vigente_desde' })
  vigenteDesde: string;

  @Column({ default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
