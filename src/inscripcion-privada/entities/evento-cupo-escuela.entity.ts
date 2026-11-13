// inscripcion-privada/entities/evento-cupo-escuela.entity.ts
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Escuela } from '../../escuelas/entities/escuela.entity';
import { Evento } from '../../eventos/entities/evento.entity';

// Cupo de boletas de una escuela en un evento. La base impone además
// CHECK (usadas <= cupo), así que ni dos inscripciones simultáneas pueden pasarse.
@Entity('evento_cupo_escuela')
@Unique('uq_cupo_escuela', ['evento', 'escuela'])
export class EventoCupoEscuela {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Evento, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  @ManyToOne(() => Escuela, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'escuela_id' })
  escuela: Escuela;

  @Column({ type: 'int' })
  cupo: number;

  // Boletas ya tomadas. Solo se modifica con el UPDATE atómico del servicio.
  @Column({ type: 'int', default: 0 })
  usadas: number;
}