import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';

@Entity('escuelas')
export class Escuela {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  direccion: string;



  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefonoSecundario: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  // 👤 Director (Un usuario puede dirigir esta escuela)
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'director_id' })
  director: Usuario;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'apoyo_administrativo_id' })
  apoyoAdministrativo: Usuario;

  // 👨‍🏫 Formadores (Muchos usuarios a Muchas escuelas)
  @ManyToMany(() => Usuario, (usuario) => usuario.escuelasFormador)
  @JoinTable({
    name: 'escuelas_formadores',
    joinColumn: { name: 'escuela_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'formador_id', referencedColumnName: 'id' },
  })
  formadores: Usuario[];

  // 🎓 Estudiantes (Un estudiante pertenece SOLO a esta escuela)
  @OneToMany(() => Estudiante, (estudiante) => estudiante.escuela)
  estudiantes: Estudiante[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}