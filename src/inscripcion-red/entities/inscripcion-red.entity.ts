// inscripcion-red/entities/inscripcion-red.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { TipoDocumento } from '../../common/entity/persona-base.entity';
import { Evento } from '../../eventos/entities/evento.entity';

export enum RedPrograma {
  MUSICA = 'MUSICA',
  RPAC = 'RPAC',
}

// Bucket calculado al inscribirse (red + rol + edad), guardado tal cual para
// que contar cupos y reportar por categoría no tenga que recalcularlo cada
// vez. Ver `determinarCategoria` en inscripcion-red.service.ts para la regla.
export enum CategoriaInscripcionRed {
  NINOS_MUSICA = 'NINOS_MUSICA',
  JOVENES_MUSICA = 'JOVENES_MUSICA',
  LABORATORIO_RED = 'LABORATORIO_RED',
  RPAC = 'RPAC',
  EQUIPO_INTERNO = 'EQUIPO_INTERNO',
}

@Entity('inscripciones_red')
@Index(['evento', 'documento'], { unique: true }) // un registro por persona por evento
export class InscripcionRed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Evento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evento_id' })
  evento: Evento;

  @Column({ type: 'enum', enum: RedPrograma })
  red: RedPrograma;

  // String libre y no un enum de Postgres: el conjunto válido depende de
  // `red` (Música tiene 6 roles, RPAC otros 5) y se valida en el DTO/service,
  // no en la base de datos.
  @Column({ length: 50 })
  rol: string;

  @Column({ type: 'varchar', nullable: true, length: 150 })
  rolOtro?: string | null;

  @Column({ type: 'enum', enum: CategoriaInscripcionRed })
  categoria: CategoriaInscripcionRed;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'enum', enum: TipoDocumento, name: 'tipo_documento' })
  tipoDocumento: TipoDocumento;

  @Index()
  @Column({ length: 20 })
  documento: string;

  @Column({ length: 150 })
  escuela: string;

  @Column({ length: 20 })
  celular: string;

  @Column({ length: 150 })
  correo: string;

  @Column({ type: 'int' })
  edad: number;

  @Column({ type: 'varchar', nullable: true, length: 150, name: 'nombre_acudiente' })
  nombreAcudiente?: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;
}
