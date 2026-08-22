import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombres: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, default: 'FORMADOR' })
  rol: string; // 'ADMIN', 'DIRECTOR', 'APOYO_ADMINISTRATIVO', 'FORMADOR'

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  // 🏛️ Escuelas donde este usuario es Director (OneToMany)
  @OneToMany(() => Escuela, (escuela) => escuela.director)
  escuelasDirector: Escuela[];

  // 📋 Escuelas donde este usuario es Apoyo Administrativo (OneToMany)
  @OneToMany(() => Escuela, (escuela) => escuela.apoyoAdministrativo)
  escuelasApoyo: Escuela[];

  // 👨‍🏫 Escuelas donde este usuario imparte clases como Formador (ManyToMany)
  @ManyToMany(() => Escuela, (escuela) => escuela.formadores)
  escuelasFormador: Escuela[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}