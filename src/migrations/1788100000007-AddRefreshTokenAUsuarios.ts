// 1788100000007-AddRefreshTokenAUsuarios.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenAUsuarios1788100000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN IF NOT EXISTS "refresh_token_hash" VARCHAR,
      ADD COLUMN IF NOT EXISTS "refresh_token_expira" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN IF EXISTS "refresh_token_hash",
      DROP COLUMN IF EXISTS "refresh_token_expira"
    `);
  }
}
