// inscripcion-privada/entities/evento-inscripcion-privada.entity.ts
import {
  Column, CreateDateColumn, Entity, JoinColumn, OneToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Evento } from '../../eventos/entities/evento.entity';

@Entity('evento_inscripcion_privada')
export class EventoInscripcionPrivada {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Evento, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  // Parte del enlace que se comparte. Aleatorio e imposible de adivinar.
  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({ default: true })
  activa: boolean;

  @Column({ name: 'escuelas_habilitadas', default: true })
  escuelasHabilitadas: boolean;

  @Column({ name: 'agrupaciones_habilitadas', default: true })
  agrupacionesHabilitadas: boolean;

  @Column({ name: 'cupo_por_escuela_defecto', type: 'int', default: 80 })
  cupoPorEscuelaDefecto: number;

  // null = sin tope por persona (hoy no lo hay; se cambia desde el front)
  @Column({ name: 'tope_boletas_por_persona', type: 'int', nullable: true })
  topeBoletasPorPersona: number | null;

  // Agrupaciones integradas: boletas por participante en escena
  @Column({ name: 'boletas_por_participante', type: 'int', default: 2 })
  boletasPorParticipante: number;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}