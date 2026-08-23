import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTipoDocumentoEnumAndUsuariosColumns1755900000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum compartido entre usuarios y estudiantes
    await queryRunner.query(`
      CREATE TYPE "tipo_documento_enum" AS ENUM ('CC', 'TI', 'CE', 'RC', 'PASAPORTE')
    `);

    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "tipo_documento" "tipo_documento_enum" NOT NULL DEFAULT 'CC',
      ADD COLUMN "fecha_nacimiento" DATE,
      ADD COLUMN "direccion" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN "tipo_documento",
      DROP COLUMN "fecha_nacimiento",
      DROP COLUMN "direccion"
    `);
    await queryRunner.query(`DROP TYPE "tipo_documento_enum"`);
  }
}