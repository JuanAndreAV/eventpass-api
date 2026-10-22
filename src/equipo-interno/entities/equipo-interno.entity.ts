// equipo-interno/entities/equipo-interno.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { TipoDocumento } from '../../common/entity/persona-base.entity';
import { Vinculacion } from './vinculacion.entity';

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

  // Dato sensible: select:false (como password/refreshTokenHash en Usuario)
  // para que ninguna consulta normal la traiga; solo se accede explícitamente
  // con addSelect cuando de verdad haga falta, y nunca debería viajar a una
  // respuesta HTTP.
  @Column({ type: 'varchar', nullable: true, length: 50, select: false, name: 'cuenta_bancaria' })
  cuentaBancaria: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  eps: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  arl: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  afp: string | null;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  cesantias: string | null;

  @Column({ type: 'enum', enum: EstadoDatosPersona, default: EstadoDatosPersona.COMPLETO, name: 'estado_datos' })
  estadoDatos: EstadoDatosPersona;

  // Para dar de baja a alguien (fin de contrato) sin borrar su historial de
  // vinculaciones ni romper la validación de equipo interno retroactivamente.
  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Vinculacion, (vinculacion) => vinculacion.persona)
  vinculaciones: Vinculacion[];

  @CreateDateColumn({ type: 'timestamptz', name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}
