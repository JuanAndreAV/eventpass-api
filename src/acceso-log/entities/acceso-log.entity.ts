import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asistente } from '../../asistentes/entities/asistente.entity';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Evento } from '../../eventos/entities/evento.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum MetodoLectura {
  QR = 'QR',
  CEDULA_PDF417 = 'CEDULA_PDF417',
  NFC = 'NFC',
  MANUAL = 'MANUAL',
}

@Entity('accesos_log')
export class AccesoLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 1. Relación con Asistente (si el escaneo pertenece a un registro de evento)
  @ManyToOne(() => Asistente, (asistente) => asistente.accesosLogs, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asistente_id' })
  asistente: Asistente;

  // 2. Relación directa con Estudiante (para historial global de ingresos)
  @ManyToOne(() => Estudiante, (estudiante) => estudiante.accesoLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante?: Estudiante;

  // 3. Relación con el Evento
  @ManyToOne(() => Evento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  // 4. Operador que escaneó (Usuario autenticado en la App/Lector)
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operador_id' })
  operador?: Usuario;

  @Column({
    type: 'enum',
    enum: MetodoLectura,
    default: MetodoLectura.QR,
  })
  metodoLectura: MetodoLectura;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaEscaneo: Date;

  @CreateDateColumn({ name: 'registrado_en_servidor' })
  registradoEnServidor: Date;
}