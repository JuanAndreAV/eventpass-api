import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Rol } from '../../rol/entities/rol.entity'

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  documento: string;

  @Column({ unique: true, length: 150 })
  email: string;

  // Oculto por defecto en select para proteger el hash de bcrypt
  @Column({ select: false })
  password: string;

  @Column({ length: 100 })
  nombres: string;

  @Column({ length: 100 })
  apellidos: string;

  @Column({ default: true })
  activo: boolean;

  // Configuración de la tabla pivot/intermedia usuarios_roles
  @ManyToMany(() => Rol, (rol) => rol.usuarios, { eager: true })
  @JoinTable({
    name: 'usuarios_roles',
    joinColumn: { name: 'usuario_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'rol_id', referencedColumnName: 'id' },
  })
  roles: Rol[];

  // Relación 1:1 opcional con el perfil de Estudiante (si aplica)
  @OneToOne(() => Estudiante, (estudiante) => estudiante.usuario)
  estudiante?: Estudiante;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}