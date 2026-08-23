import { Column } from 'typeorm';

export enum TipoDocumento {
  CC = 'CC',
  TI = 'TI',
  CE = 'CE',
  RC = 'RC',
  PASAPORTE = 'PASAPORTE',
}

export abstract class PersonaBase {
  @Column({ type: 'enum', enum: TipoDocumento, default: TipoDocumento.CC, name: 'tipo_documento' })
  tipoDocumento: TipoDocumento;

  @Column({ length: 20 })
  documento: string; // unique se define en cada entity concreta (@Index/@Column con unique)

  @Column({ length: 100 })
  nombres: string;

  @Column({ length: 100 })
  apellidos: string;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ nullable: true, length: 20 })
  telefono?: string;

  @Column({ type: 'date', nullable: true, name: 'fecha_nacimiento' })
  fechaNacimiento?: Date;

  @Column({ nullable: true, length: 255 })
  direccion?: string;
}