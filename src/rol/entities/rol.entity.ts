
import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identificador único para validaciones en código (ej: 'ADMIN', 'ESTUDIANTE', 'PROFESOR')
  @Column({ unique: true, length: 50 })
  codigo: string;

  // Nombre descriptivo para mostrar en interfaces (ej: 'Administrador del Sistema')
  @Column({ length: 100 })
  nombre: string;

  @Column({ nullable: true, type: 'text' })
  descripcion: string;

  // Relación inversa ManyToMany con Usuarios
  @ManyToMany(() => Usuario, (usuario) => usuario.roles)
  usuarios: Usuario[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}