import {
  Column, CreateDateColumn, Entity, Index,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

// puestosAdicionales es configurable porque la regla cambia entre temporadas
// (hoy: contrabajo y tuba +2, violonchelo/trombón/corno/barítono +1).
@Entity('transporte_instrumentos')
export class Instrumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ type: 'int', default: 0, name: 'puestos_adicionales' })
  puestosAdicionales: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
