import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Estudiante } from '../../estudiantes/entities/estudiante.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum MetodoIdentificacion {
  NFC = 'NFC',
  QR = 'QR',
  DOCUMENTO = 'DOCUMENTO',
}

@Entity('validaciones_identidad')
export class ValidacionIdentidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Estudiante, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operador_id' })
  operador?: Usuario;

  @Column({ type: 'enum', enum: MetodoIdentificacion })
  metodo: MetodoIdentificacion;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  fecha: Date;
}