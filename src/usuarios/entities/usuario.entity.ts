import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
  Index,
} from 'typeorm';
import { PersonaBase } from 'src/common/entity/persona-base.entity';
import { Rol } from 'src/rol/entities/rol.entity';
import { Estudiante } from 'src/estudiantes/entities/estudiante.entity';
import { Escuela } from 'src/escuelas/entities/escuela.entity';
//import { Escuela } from '../../escuelas/entities/escuela.entity';

@Entity('usuarios')
export class Usuario extends PersonaBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 20, unique: true })
  declare documento: string; // sobreescribe para marcar unique real de la tabla

  @Index({ unique: true })
  @Column({ length: 150, unique: true })
  declare email: string; // en usuarios SÍ es obligatorio y único (a diferencia de estudiantes)

  @Column({ select: false }) // nunca se trae por defecto, solo con addSelect explícito
  password: string;

  @Column({ default: true })
  activo: boolean;

  @ManyToMany(() => Rol, (rol) => rol.usuarios)
  @JoinTable({
    name: 'usuarios_roles',
    joinColumn: { name: 'usuario_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'rol_id', referencedColumnName: 'id' },
  })
  roles: Rol[];

  @OneToOne(() => Estudiante, (estudiante) => estudiante.usuario)
  estudiante?: Estudiante;

  @OneToMany(() => Escuela, (escuela) => escuela.director)
escuelasDirector: Escuela[];

@OneToMany(() => Escuela, (escuela) => escuela.apoyoAdministrativo)
escuelasApoyo: Escuela[];

@ManyToMany(() => Escuela, (escuela) => escuela.formadores)
escuelasFormador: Escuela[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}