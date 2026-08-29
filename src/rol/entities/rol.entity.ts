
import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  codigo: string; // ADMIN, DIRECTOR, APOYO, FORMADOR

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @ManyToMany(() => Usuario, (usuario) => usuario.roles)
  usuarios: Usuario[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz'  })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz'  })
  updatedAt: Date;
}