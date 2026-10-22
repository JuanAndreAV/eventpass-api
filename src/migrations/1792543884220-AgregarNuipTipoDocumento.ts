<<<<<<< HEAD
import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarNuipTipoDocumento1792543884220 implements MigrationInterface {
 name = 'AgregarNuipTipoDocumento1792543884220'
    public async up(queryRunner: QueryRunner): Promise<void> {
await queryRunner.query(`ALTER TYPE "tipo_documento_enum" ADD VALUE IF NOT EXISTS 'NUIP'`);
await queryRunner.query(`ALTER TYPE "tipo_documento_enum" ADD VALUE IF NOT EXISTS 'PPT'`);  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de un enum; se deja vacío a propósito
  }

=======
// 1792543884220-AgregarNuipTipoDocumento.ts
//
// Archivo creado después de que la migración ya corrió contra la base
// compartida (la ejecutó un compañero directo, sin commitear el archivo).
// El nombre y el timestamp son exactamente los que ya están registrados en
// la tabla "migrations", así que TypeORM no la vuelve a correr — esto es
// solo para dejarla documentada y que una base nueva quede igual.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarNuipTipoDocumento1792543884220 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // NUIP: Número Único de Identificación Personal (menores sin cédula
    // aún). PPT: Permiso por Protección Temporal (migrantes venezolanos).
    await queryRunner.query(`ALTER TYPE "tipo_documento_enum" ADD VALUE IF NOT EXISTS 'NUIP'`);
    await queryRunner.query(`ALTER TYPE "tipo_documento_enum" ADD VALUE IF NOT EXISTS 'PPT'`);
  }

  public async down(): Promise<void> {
    // Postgres no soporta quitar un valor de un enum directamente.
    // Si es necesario, hay que recrear "tipo_documento_enum" sin ese valor.
    console.warn(
      'No se puede revertir automáticamente un valor de ENUM en Postgres. ' +
      'Si es necesario, crea una migración manual que reconstruya "tipo_documento_enum" sin NUIP/PPT.',
    );
  }
>>>>>>> 68b5c63cb5bad88f92f82b05b96ac4cce7d853ff
}
