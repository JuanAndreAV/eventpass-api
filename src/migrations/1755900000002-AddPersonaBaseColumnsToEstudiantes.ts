import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonaBaseColumnsToEstudiantes1755900000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Reutiliza el enum ya creado en la migración anterior
    await queryRunner.query(`
      ALTER TABLE "estudiantes"
      ADD COLUMN "tipo_documento" "tipo_documento_enum" NOT NULL DEFAULT 'CC',
      ADD COLUMN "fecha_nacimiento" DATE,
      ADD COLUMN "direccion" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "estudiantes"
      DROP COLUMN "tipo_documento",
      DROP COLUMN "fecha_nacimiento",
      DROP COLUMN "direccion"
    `);
  }
}