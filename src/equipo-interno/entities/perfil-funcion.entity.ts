// equipo-interno/entities/perfil-funcion.entity.ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('equipo_perfiles_funciones')
export class PerfilFuncion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // El "FUN-001" del JSON de origen.
  @Index({ unique: true })
  @Column({ unique: true, length: 30, name: 'codigo_importacion' })
  codigoImportacion: string;

  // Texto libre del Excel (ej. "ARTISTA FORMADOR"): no es FK a Cargo porque
  // varios perfiles de funciones distintos pueden compartir el mismo cargo
  // de referencia (ver cargo_referencia repetido en el JSON de origen).
  @Column({ length: 150, name: 'cargo_referencia' })
  cargoReferencia: string;

  // Lista de funciones (bullets del Excel). simple-json: no hay precedente
  // de columnas array/jsonb en este codebase todavía, y el valor es
  // simplemente una lista de strings a mostrar tal cual, sin necesidad de
  // consultarla por contenido — no justifica un jsonb nativo con operadores.
  @Column({ type: 'simple-json' })
  items: string[];
}
