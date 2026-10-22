// equipo-interno/entities/objeto-contrato.entity.ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Catálogo deduplicado: varias vinculaciones comparten el mismo texto de
// objeto contractual, así que se guarda una vez y se referencia por FK.
@Entity('equipo_objetos_contrato')
export class ObjetoContrato {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El "OBJ-001" del JSON de origen.
  @Index({ unique: true })
  @Column({ unique: true, length: 30, name: 'codigo_importacion' })
  codigoImportacion: string;

  @Column({ type: 'text' })
  texto: string;
}
