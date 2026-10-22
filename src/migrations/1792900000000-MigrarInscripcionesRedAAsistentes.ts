// 1792900000000-MigrarInscripcionesRedAAsistentes.ts
//
// Consolida "inscripciones_red" dentro de "asistentes": así las
// inscripciones por red también obtienen qrToken/ingresado/accesosLog, que
// antes solo tenía el flujo general de asistentes — sin esto, el equipo no
// podía escanear a los inscritos por red el día del evento (el escáner solo
// conoce la tabla Asistente). Reutiliza los tipos enum que ya existían para
// inscripciones_red (red/categoria) y para tipo_documento, en vez de crear
// duplicados — por eso el down() no los borra, solo las columnas nuevas.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrarInscripcionesRedAAsistentes1792900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "asistentes"
        ADD COLUMN "tipo_documento" "public"."tipo_documento_enum",
        ADD COLUMN "red" "public"."inscripciones_red_red_enum",
        ADD COLUMN "rol" character varying(50),
        ADD COLUMN "rol_otro" character varying(150),
        ADD COLUMN "categoria" "public"."inscripciones_red_categoria_enum",
        ADD COLUMN "escuela" character varying(150),
        ADD COLUMN "edad" integer,
        ADD COLUMN "nombre_acudiente" character varying(150)
    `);

    // Migra los datos reales (si hay alguno) resolviendo estudiante_id por
    // documento cuando corresponda, generando un qr_token nuevo (antes no
    // tenían) y conservando la fecha original de inscripción.
    await queryRunner.query(`
      INSERT INTO "asistentes" (
        "evento_id", "documento", "nombreCompleto", "email", "telefono", "tipo",
        "tipo_documento", "red", "rol", "rol_otro", "categoria", "escuela", "edad",
        "nombre_acudiente", "estudiante_id", "qrToken", "ingresado", "fechaInscripcion"
      )
      SELECT
        ir."evento_id", ir."documento", ir."nombre", ir."correo", ir."celular", 'RED',
        ir."tipo_documento", ir."red", ir."rol", ir."rolOtro", ir."categoria", ir."escuela", ir."edad",
        ir."nombre_acudiente", e."id", uuid_generate_v4()::text, false, ir."creado_en"
      FROM "inscripciones_red" ir
      LEFT JOIN "estudiantes" e ON e."documento" = ir."documento"
    `);

    await queryRunner.query(`DROP TABLE "inscripciones_red"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
        "edad" integer,
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

    await queryRunner.query(`
      INSERT INTO "inscripciones_red" (
        "evento_id", "red", "rol", "rolOtro", "categoria", "nombre", "tipo_documento",
        "documento", "escuela", "celular", "correo", "edad", "nombre_acudiente", "creado_en"
      )
      SELECT
        "evento_id", "red", "rol", "rol_otro", "categoria", "nombreCompleto", "tipo_documento",
        "documento", "escuela", "telefono", "email", "edad", "nombre_acudiente", "fechaInscripcion"
      FROM "asistentes"
      WHERE "tipo" = 'RED'
    `);

    await queryRunner.query(`DELETE FROM "asistentes" WHERE "tipo" = 'RED'`);

    await queryRunner.query(`
      ALTER TABLE "asistentes"
        DROP COLUMN "tipo_documento",
        DROP COLUMN "red",
        DROP COLUMN "rol",
        DROP COLUMN "rol_otro",
        DROP COLUMN "categoria",
        DROP COLUMN "escuela",
        DROP COLUMN "edad",
        DROP COLUMN "nombre_acudiente"
    `);
  }
}
