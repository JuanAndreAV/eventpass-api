// equipo-interno/entities/cargo.entity.ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Clasificación administrativa/contractual del cargo (cómo está vinculada la
// persona), no un filtro para inscripcion-red: ahí la validación de "equipo
// interno" es simplemente "¿este documento existe en equipo_interno?",
// sin importar a cuál de estos tres grupos pertenezca su cargo real.
export enum GrupoCargo {
  LABORAL_FORMACION = 'LABORAL_FORMACION',
  LABORAL_ADMINISTRATIVO = 'LABORAL_ADMINISTRATIVO',
  PRESTACION_SERVICIOS = 'PRESTACION_SERVICIOS',
}

@Entity('equipo_cargos')
export class Cargo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El "CAR-001" del JSON de origen.
  @Index({ unique: true })
  @Column({ unique: true, length: 30, name: 'codigo_importacion' })
  codigoImportacion: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100 })
  codigo: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'enum', enum: GrupoCargo })
  grupo: GrupoCargo;
}
