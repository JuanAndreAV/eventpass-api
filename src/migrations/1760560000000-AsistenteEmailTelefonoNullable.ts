import { MigrationInterface, QueryRunner } from 'typeorm';

export class AsistenteEmailTelefonoNullable1760560000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asistentes"
      ALTER COLUMN "email" DROP NOT NULL,
      ALTER COLUMN "telefono" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asistentes"
      ALTER COLUMN "email" SET NOT NULL,
      ALTER COLUMN "telefono" SET NOT NULL
    `);
  }
}