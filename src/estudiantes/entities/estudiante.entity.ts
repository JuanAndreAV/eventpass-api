import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AccesoLog } from '../../acceso-log/entities/acceso-log.entity';
import { Asistente } from '../../asistentes/entities/asistente.entity';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { PersonaBase } from 'src/common/entity/persona-base.entity';

// estudiante.entity.ts
@Entity('estudiantes')
export class Estudiante extends PersonaBase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 20 })
  declare documento: string;

  @Column({ nullable: true, length: 100 })
  instrumento?: string;

  @Column({ nullable: true, type: 'text' })
  fotoUrl?: string;

  @Index({ unique: true })
  @Column({ unique: true, nullable: true, length: 100 })
  nfcUid?: string;

  @Index({ unique: true })
  @Column({ unique: true, nullable: true, length: 255 })
  qrTokenMaster?: string;

  @OneToOne(() => Usuario, (usuario) => usuario.estudiante, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @ManyToOne(() => Escuela, (escuela) => escuela.estudiantes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;

  @OneToMany(() => Asistente, (asistente) => asistente.estudiante)
  asistencias: Asistente[];

  @OneToMany(() => AccesoLog, (log) => log.estudiante)
  accesoLogs: AccesoLog[];

  @CreateDateColumn({ name: 'created_at' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  actualizadoEn: Date;
}