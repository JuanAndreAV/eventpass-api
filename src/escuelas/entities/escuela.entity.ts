import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Evento } from '../../eventos/entities/evento.entity';
// Ajusta la ruta si tu carpeta de equipo interno es distinta
import { EquipoAsignacion } from '../../equipo-interno/entities/equipo_asignacion.entity';

@Entity('escuelas')
export class Escuela {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 50 })
  codigo: string;

  @Column({ length: 200, nullable: true })
  direccion?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ length: 50, nullable: true })
  telefono?: string;

  @Column({ length: 50, nullable: true, name: 'telefono_secundario' })
  telefonoSecundario?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ default: true })
  activa: boolean;

  // Director, apoyo administrativo y formadores ya no cuelgan de Usuario:
  // se obtienen de equipo_asignaciones filtrando por cargo (Director de
  // escuela, Apoyo administrativo de escuela, Artista formador o tallerista).
  // Las columnas director_id / apoyo_administrativo_id y la tabla
  // escuelas_formadores siguen en la base, sin mapear, hasta una migración
  // posterior que las elimine.
  @OneToMany(() => EquipoAsignacion, (a) => a.escuela)
  asignaciones: EquipoAsignacion[];

  @OneToMany(() => Estudiante, (estudiante) => estudiante.escuela)
  estudiantes: Estudiante[];

  @OneToMany(() => Evento, (evento) => evento.escuela)
  eventos: Evento[];

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}