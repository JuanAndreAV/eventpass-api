// 1755900000003-ExpandEscuelas.ts — versión idempotente
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandEscuelas1755900000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "escuelas"
      ADD COLUMN IF NOT EXISTS "direccion" VARCHAR(200),
      ADD COLUMN IF NOT EXISTS "email" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "telefono_secundario" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "descripcion" TEXT,
      ADD COLUMN IF NOT EXISTS "activa" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "director_id" UUID,
      ADD COLUMN IF NOT EXISTS "apoyo_administrativo_id" UUID,
      ADD COLUMN IF NOT EXISTS "actualizado_en" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_escuelas_director'
        ) THEN
          ALTER TABLE "escuelas"
          ADD CONSTRAINT "FK_escuelas_director"
            FOREIGN KEY ("director_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_escuelas_apoyo_administrativo'
        ) THEN
          ALTER TABLE "escuelas"
          ADD CONSTRAINT "FK_escuelas_apoyo_administrativo"
            FOREIGN KEY ("apoyo_administrativo_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "escuelas_formadores" (
        "escuela_id" UUID NOT NULL,
        "formador_id" UUID NOT NULL,
        CONSTRAINT "PK_escuelas_formadores" PRIMARY KEY ("escuela_id", "formador_id"),
        CONSTRAINT "FK_escuelas_formadores_escuela"
          FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_escuelas_formadores_usuario"
          FOREIGN KEY ("formador_id") REFERENCES "usuarios"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "escuelas_formadores"`);
    await queryRunner.query(`
      ALTER TABLE "escuelas"
      DROP CONSTRAINT IF EXISTS "FK_escuelas_director",
      DROP CONSTRAINT IF EXISTS "FK_escuelas_apoyo_administrativo"
    `);
    await queryRunner.query(`
      ALTER TABLE "escuelas"
      DROP COLUMN IF EXISTS "direccion",
      DROP COLUMN IF EXISTS "email",
      DROP COLUMN IF EXISTS "telefono",
      DROP COLUMN IF EXISTS "telefono_secundario",
      DROP COLUMN IF EXISTS "descripcion",
      DROP COLUMN IF EXISTS "activa",
      DROP COLUMN IF EXISTS "director_id",
      DROP COLUMN IF EXISTS "apoyo_administrativo_id",
      DROP COLUMN IF EXISTS "actualizado_en"
    `);
  }
}