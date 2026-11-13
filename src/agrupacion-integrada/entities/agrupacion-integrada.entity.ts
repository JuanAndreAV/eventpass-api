import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { EstudianteAgrupacion } from './estudiante-agrupacion.entity';

@Entity('agrupaciones_integradas')
export class AgrupacionIntegrada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: false })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  @OneToMany(() => EstudianteAgrupacion, (relacion) => relacion.agrupacion)
  estudiantesRelacion: EstudianteAgrupacion[];
}