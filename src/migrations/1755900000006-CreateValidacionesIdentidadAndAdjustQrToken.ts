// 1735000006-CreateValidacionesIdentidadAndAdjustQrToken.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateValidacionesIdentidadAndAdjustQrToken1755900000006
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "metodo_identificacion_enum" AS ENUM ('NFC', 'QR', 'DOCUMENTO')
    `);

    await queryRunner.query(`
      CREATE TABLE "validaciones_identidad" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "estudiante_id" UUID NOT NULL,
        "operador_id" UUID,
        "metodo" "metodo_identificacion_enum" NOT NULL,
        "fecha" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_validaciones_estudiante"
          FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_validaciones_operador"
          FOREIGN KEY ("operador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL
      )
    `);

    // Los JWT firmados son más largos que un UUID — varchar(255) se queda corto
    await queryRunner.query(`
      ALTER TABLE "asistentes" ALTER COLUMN "qrToken" TYPE TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE "estudiantes" ALTER COLUMN "qrTokenMaster" TYPE TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "estudiantes" ALTER COLUMN "qrTokenMaster" TYPE VARCHAR(255)`);
    await queryRunner.query(`ALTER TABLE "asistentes" ALTER COLUMN "qrToken" TYPE VARCHAR(255)`);
    await queryRunner.query(`DROP TABLE "validaciones_identidad"`);
    await queryRunner.query(`DROP TYPE "metodo_identificacion_enum"`);
  }
}