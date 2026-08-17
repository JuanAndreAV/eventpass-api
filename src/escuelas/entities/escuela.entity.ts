import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Evento } from '../../eventos/entities/evento.entity';

@Entity('escuelas')
export class Escuela {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  codigo: string;

  @OneToMany(() => Estudiante, (estudiante) => estudiante.escuela)
  estudiantes: Estudiante[];

  @OneToMany(() => Evento, (evento) => evento.escuela)
  eventos: Evento[];

  @CreateDateColumn()
  creadoEn: Date;
}