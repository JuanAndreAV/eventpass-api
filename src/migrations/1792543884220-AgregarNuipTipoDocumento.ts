import { MigrationInterface, QueryRunner } from "typeorm";

export class AgregarNuipTipoDocumento1792543884220 implements MigrationInterface {
 name = 'AgregarNuipTipoDocumento1792543884220'
    public async up(queryRunner: QueryRunner): Promise<void> {
await queryRunner.query(`ALTER TYPE "tipo_documento_enum" ADD VALUE IF NOT EXISTS 'NUIP'`);
await queryRunner.query(`ALTER TYPE "tipo_documento_enum" ADD VALUE IF NOT EXISTS 'PPT'`);  }

  public async down(): Promise<void> {
    // Postgres no permite quitar un valor de un enum; se deja vacío a propósito
  }

}
