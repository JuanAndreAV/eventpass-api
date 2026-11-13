import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AgrupacionIntegrada } from './agrupacion-integrada.entity';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';
// Importa aquí tu entidad de Estudiante existente (ej: import { Estudiante } from '../estudiantes/estudiante.entity';)

@Entity('estudiantes_agrupacion')
@Unique(['estudianteId', 'agrupacionId'])
export class EstudianteAgrupacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'estudiante_id', type: 'uuid' })
  estudianteId: string;

  @Column({ name: 'agrupacion_id', type: 'uuid' })
  agrupacionId: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;

  // Relación ManyToOne hacia la Agrupación
  @ManyToOne(() => AgrupacionIntegrada, (agrupacion) => agrupacion.estudiantesRelacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agrupacion_id' })
  agrupacion: AgrupacionIntegrada;

  
  @ManyToOne(() => Estudiante, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;
  
}