import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Asistente } from '../../asistentes/entities/asistente.entity';

@Entity('estudiantes')
export class Estudiante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  documento: string;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  instrumento: string; // Violín, Piano, Canto, etc.

  @Column({ nullable: true })
  fotoUrl: string; // URL alojada en Firebase Storage

  @Index()
  @Column({ unique: true, nullable: true })
  nfcUid: string;

  @Index()
  @Column({ unique: true, nullable: true })
  qrTokenMaster: string;

  @ManyToOne(() => Escuela, (escuela) => escuela.estudiantes, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;

  @OneToMany(() => Asistente, (asistente) => asistente.estudiante)
  asistencias: Asistente[];

  @CreateDateColumn()
  creadoEn: Date;
}