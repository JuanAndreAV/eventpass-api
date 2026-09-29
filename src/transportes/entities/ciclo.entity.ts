import {
  Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Agrupacion } from './agrupacion.entity';
import { Solicitud } from './solicitud.entity';

export enum EstadoCiclo {
  BORRADOR = 'BORRADOR',
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO',
  PROCESADO = 'PROCESADO',
}

// Un ciclo es la convocatoria de transporte de un evento (ensayo o concierto):
// abre, recibe solicitudes hasta la hora de cierre y luego se procesa.
@Entity('transporte_ciclos')
export class Ciclo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'timestamptz', name: 'fecha_evento' })
  fechaEvento: Date;

  @Column({ length: 200 })
  destino: string;

  @Column({ type: 'timestamptz', name: 'fecha_cierre' })
  fechaCierre: Date;

  // Texto libre: en la operación real combinan varios horarios en una sola línea
  // ("7:30 A.M. RURAL Y 8:00 A.M. URBANA").
  @Column({ length: 200, nullable: true, name: 'hora_recogida' })
  horaRecogida?: string;

  @Column({ length: 200, nullable: true, name: 'hora_regreso' })
  horaRegreso?: string;

  @Column({ type: 'enum', enum: EstadoCiclo, default: EstadoCiclo.BORRADOR })
  estado: EstadoCiclo;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @ManyToMany(() => Agrupacion, (agrupacion) => agrupacion.ciclos)
  @JoinTable({
    name: 'transporte_ciclos_agrupaciones',
    joinColumn: { name: 'ciclo_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'agrupacion_id', referencedColumnName: 'id' },
  })
  agrupaciones: Agrupacion[];

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creado_por_id' })
  creadoPor?: Usuario | null;

  @OneToMany(() => Solicitud, (solicitud) => solicitud.ciclo)
  solicitudes: Solicitud[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  actualizadoEn: Date;
}
