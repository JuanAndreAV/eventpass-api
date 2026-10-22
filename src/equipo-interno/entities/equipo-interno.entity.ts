// equipo-interno/entities/equipo-interno.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { TipoDocumento } from '../../common/entity/persona-base.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

// No extiende PersonaBase (a diferencia de Usuario/Estudiante): PersonaBase
// exige nombres y apellidos por separado, pero la fuente de este equipo
// (Excel de la Fundación UdeA) no separa el nombre de forma consistente —
// mezclar nombres/apellidos mal partidos sería peor que no partirlos. Se
// sigue en cambio el patrón de Asistente.nombreCompleto, que ya resuelve
// exactamente este mismo caso en este codebase.
export enum EstadoDatosPersona {
  COMPLETO = 'COMPLETO',
  PENDIENTE = 'PENDIENTE',
}

@Entity('equipo_interno_personas')
export class EquipoInterno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200, name: 'nombre_completo' })
  nombreCompleto: string;

  // Nullable: "no viene en el Excel" para casi nadie (ver metadata de origen).
  @Column({ type: 'enum', enum: TipoDocumento, nullable: true, name: 'tipo_documento' })
  tipoDocumento: TipoDocumento | null;

  // Único pero nullable: nulo solo para las ~5 personas con datos pendientes
  // (estadoDatos=PENDIENTE); Postgres permite varios NULL en una columna
  // UNIQUE sin violarla, así que no choca con la restricción.
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, nullable: true, length: 20 })
  documento: string | null;

  @Column({ type: 'varchar', nullable: true, length: 150 })
  email: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  telefono: string | null;

  @Column({ type: 'enum', enum: EstadoDatosPersona, default: EstadoDatosPersona.COMPLETO, name: 'estado_datos' })
  estadoDatos: EstadoDatosPersona;

  // Para dar de baja a alguien (fin de contrato) sin romper la validación de
  // equipo interno retroactivamente.
  @Column({ default: true })
  activo: boolean;

  // Nullable: la mayoría del personal real importado del Excel no tiene
  // cuenta de usuario en este sistema (no inician sesión aquí) — solo se
  // enlaza cuando coincide por documento, para no repetir nombre/correo que
  // ya vive en "usuarios".
  @OneToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
