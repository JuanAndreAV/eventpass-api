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

@Entity('estudiantes')
export class Estudiante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true, length: 20 })
  documento: string;

  @Column({ length: 100 })
  nombres: string;

  @Column({ length: 100 })
  apellidos: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ nullable: true, length: 20 })
  telefono: string;

  @Column({ nullable: true, length: 100 })
  instrumento: string; // Violín, Piano, Clarinete, etc.

  @Column({ nullable: true, type: 'text' })
  fotoUrl: string; // URL pública alojada en Supabase Storage (bucket: fotos-estudiantes)

  @Index()
  @Column({ unique: true, nullable: true, length: 100 })
  nfcUid: string;

  @Index()
  @Column({ unique: true, nullable: true, length: 255 })
  qrTokenMaster: string;

  // 1. Relación Opcional con la cuenta de acceso de Usuario (1 a 1)
  @OneToOne(() => Usuario, (usuario) => usuario.estudiante, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  // 2. Relación con la Escuela / Sede a la que pertenece
  @ManyToOne(() => Escuela, (escuela) => escuela.estudiantes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;

  // 3. Relación con Asistencias a Eventos
  @OneToMany(() => Asistente, (asistente) => asistente.estudiante)
  asistencias: Asistente[];

  // 4. Relación con Logs de Accesos (Escaneo QR / NFC)
  @OneToMany(() => AccesoLog, (log) => log.estudiante)
  accesoLogs: AccesoLog[];

  @CreateDateColumn({ name: 'created_at' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  actualizadoEn: Date;
}