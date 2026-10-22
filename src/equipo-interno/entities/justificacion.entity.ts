// equipo-interno/entities/justificacion.entity.ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('equipo_justificaciones')
export class Justificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El "JUS-001" del JSON de origen.
  @Index({ unique: true })
  @Column({ unique: true, length: 30, name: 'codigo_importacion' })
  codigoImportacion: string;

  @Column({ type: 'text' })
  texto: string;
}
