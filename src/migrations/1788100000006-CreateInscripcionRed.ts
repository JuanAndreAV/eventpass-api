// 1788100000006-CreateInscripcionRed.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInscripcionRed1788100000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "eventos"
      ADD COLUMN IF NOT EXISTS "usa_formulario_red" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "cupo_ninos_musica" INTEGER,
      ADD COLUMN IF NOT EXISTS "cupo_jovenes_musica" INTEGER,
      ADD COLUMN IF NOT EXISTS "cupo_laboratorio_red" INTEGER,
      ADD COLUMN IF NOT EXISTS "cupo_rpac" INTEGER,
      ADD COLUMN IF NOT EXISTS "cupo_equipo_interno" INTEGER
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."inscripciones_red_red_enum" AS ENUM ('MUSICA', 'RPAC')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."inscripciones_red_categoria_enum" AS ENUM (
        'NINOS_MUSICA', 'JOVENES_MUSICA', 'LABORATORIO_RED', 'RPAC', 'EQUIPO_INTERNO'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "inscripciones_red" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "evento_id" uuid NOT NULL,
        "red" "public"."inscripciones_red_red_enum" NOT NULL,
        "rol" character varying(50) NOT NULL,
        "rolOtro" character varying(150),
        "categoria" "public"."inscripciones_red_categoria_enum" NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "tipo_documento" "public"."tipo_documento_enum" NOT NULL,
        "documento" character varying(20) NOT NULL,
        "escuela" character varying(150) NOT NULL,
        "celular" character varying(20) NOT NULL,
        "correo" character varying(150) NOT NULL,
        "edad" integer NOT NULL,
        "nombre_acudiente" character varying(150),
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inscripciones_red" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inscripciones_red_evento" FOREIGN KEY ("evento_id")
          REFERENCES "eventos"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_inscripciones_red_evento_documento"
      ON "inscripciones_red" ("evento_id", "documento")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_inscripciones_red_documento" ON "inscripciones_red" ("documento")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inscripciones_red"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."inscripciones_red_categoria_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."inscripciones_red_red_enum"`);
    await queryRunner.query(`
      ALTER TABLE "eventos"
      DROP COLUMN IF EXISTS "usa_formulario_red",
      DROP COLUMN IF EXISTS "cupo_ninos_musica",
      DROP COLUMN IF EXISTS "cupo_jovenes_musica",
      DROP COLUMN IF EXISTS "cupo_laboratorio_red",
      DROP COLUMN IF EXISTS "cupo_rpac",
      DROP COLUMN IF EXISTS "cupo_equipo_interno"
    `);
  }
}
