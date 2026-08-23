// 1755900000007-AddTelefonoToUsuarios.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelefonoToUsuarios1755900000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN IF EXISTS "telefono"
    `);
  }
}