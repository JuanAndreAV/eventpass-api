// 1788100000005-AddBloqueoLoginAUsuarios.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBloqueoLoginAUsuarios1788100000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "bloqueado_hasta" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN IF EXISTS "intentos_fallidos",
      DROP COLUMN IF EXISTS "bloqueado_hasta"
    `);
  }
}
