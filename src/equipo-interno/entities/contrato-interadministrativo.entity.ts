// equipo-interno/entities/contrato-interadministrativo.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('equipo_contratos_interadministrativos')
export class ContratoInteradministrativo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El "CIA-001" del JSON de origen: permite reimportar sin duplicar
  // (upsert por este código, no por id interno).
  @Index({ unique: true })
  @Column({ unique: true, length: 30, name: 'codigo_importacion' })
  codigoImportacion: string;

  @Column({ length: 30 })
  numero: string;

  @Column({ type: 'int' })
  anio: number;

  @Column({ length: 255, name: 'entidad_contratante' })
  entidadContratante: string;

  @Column({ length: 255, name: 'entidad_ejecutora' })
  entidadEjecutora: string;

  @Column({ type: 'text' })
  objeto: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;
}
