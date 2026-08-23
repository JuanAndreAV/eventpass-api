import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany,
  OneToMany, JoinColumn, JoinTable,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Evento } from '../../eventos/entities/evento.entity';

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

  @ManyToOne(() => Usuario, (usuario) => usuario.escuelasDirector, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'director_id' })
  director?: Usuario | null;

  @ManyToOne(() => Usuario, (usuario) => usuario.escuelasApoyo, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'apoyo_administrativo_id' })
  apoyoAdministrativo?: Usuario | null;

  @ManyToMany(() => Usuario, (usuario) => usuario.escuelasFormador)
  @JoinTable({
    name: 'escuelas_formadores',
    joinColumn: { name: 'escuela_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'formador_id', referencedColumnName: 'id' },
  })
  formadores: Usuario[];

  @OneToMany(() => Estudiante, (estudiante) => estudiante.escuela)
  estudiantes: Estudiante[];

  @OneToMany(() => Evento, (evento) => evento.escuela)
  eventos: Evento[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn({name: 'actualizado_en' })
  actualizadoEn: Date;
}