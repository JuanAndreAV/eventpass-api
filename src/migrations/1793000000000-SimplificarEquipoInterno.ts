// 1793000000000-SimplificarEquipoInterno.ts
//
// Ningún frontend llegó a usar nunca los catálogos (cargos, contratos,
// objetos de contrato, justificaciones, perfiles de función) ni las
// vinculaciones que se importaron junto con el Excel de equipo interno —
// inscripcion-red solo necesita existeActivo()/buscarActivo() sobre
// equipo_interno_personas, nada de eso. Se borran por completo: son datos
// de nómina reales (194 vinculaciones) que SÍ se pierden con esta migración
// (a diferencia de las columnas de abajo, que siempre estuvieron vacías), y
// se pueden reconstruir desde el Excel/JSON original si algún día hace
// falta volver a esta complejidad con un caso de uso real detrás.
//
// Además:
//  - cuenta_bancaria/eps/arl/afp/cesantias nunca tuvieron un solo valor no
//    nulo en los 199 registros (el Excel de origen las traía vacías) — se
//    eliminan sin pérdida de datos real.
//  - se agrega equipo_interno_personas.usuario_id (nullable) para enlazar
//    con la cuenta de usuario cuando coincide por documento, en vez de
//    seguir repitiendo nombre/correo que ya vive en "usuarios".
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplificarEquipoInterno1793000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_vinculaciones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_cargos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_objetos_contrato"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_justificaciones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_perfiles_funciones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_contratos_interadministrativos"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_estado_vinculacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_forma_pago_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_dedicacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_tipo_vinculacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_cargos_grupo_enum"`);

    await queryRunner.query(`
      ALTER TABLE "equipo_interno_personas"
        DROP COLUMN "cuenta_bancaria",
        DROP COLUMN "eps",
        DROP COLUMN "arl",
        DROP COLUMN "afp",
        DROP COLUMN "cesantias",
        ADD COLUMN "usuario_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "equipo_interno_personas"
        ADD CONSTRAINT "FK_equipo_interno_personas_usuario" FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      UPDATE "equipo_interno_personas" eip
      SET "usuario_id" = u."id"
      FROM "usuarios" u
      WHERE u."documento" = eip."documento"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revierte la estructura, no los datos: las vinculaciones/catálogos
    // borrados en up() no se restauran (ver nota de cabecera).
    await queryRunner.query(`
      ALTER TABLE "equipo_interno_personas"
        DROP CONSTRAINT "FK_equipo_interno_personas_usuario",
        DROP COLUMN "usuario_id",
        ADD COLUMN "cuenta_bancaria" character varying(50),
        ADD COLUMN "eps" character varying(100),
        ADD COLUMN "arl" character varying(100),
        ADD COLUMN "afp" character varying(100),
        ADD COLUMN "cesantias" character varying(100)
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."equipo_cargos_grupo_enum" AS ENUM (
        'LABORAL_FORMACION', 'LABORAL_ADMINISTRATIVO', 'PRESTACION_SERVICIOS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_tipo_vinculacion_enum" AS ENUM ('LABORAL', 'PRESTACION_SERVICIOS')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_dedicacion_enum" AS ENUM (
        'TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'TREINTA_HORAS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_forma_pago_enum" AS ENUM ('QUINCENAL', 'MENSUAL', 'PAGO_UNICO')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_estado_vinculacion_enum" AS ENUM ('ACTIVO', 'PENDIENTE_CONTRATACION')
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_contratos_interadministrativos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "numero" character varying(30) NOT NULL,
        "anio" integer NOT NULL,
        "entidad_contratante" character varying(255) NOT NULL,
        "entidad_ejecutora" character varying(255) NOT NULL,
        "objeto" text NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipo_contratos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_contratos_codigo" UNIQUE ("codigo_importacion")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "equipo_cargos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "codigo" character varying(100) NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "grupo" "public"."equipo_cargos_grupo_enum" NOT NULL,
        CONSTRAINT "PK_equipo_cargos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_cargos_codigo_importacion" UNIQUE ("codigo_importacion"),
        CONSTRAINT "UQ_equipo_cargos_codigo" UNIQUE ("codigo")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "equipo_objetos_contrato" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "texto" text NOT NULL,
        CONSTRAINT "PK_equipo_objetos_contrato" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_objetos_contrato_codigo" UNIQUE ("codigo_importacion")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "equipo_justificaciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "texto" text NOT NULL,
        CONSTRAINT "PK_equipo_justificaciones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_justificaciones_codigo" UNIQUE ("codigo_importacion")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "equipo_perfiles_funciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "cargo_referencia" character varying(150) NOT NULL,
        "items" text NOT NULL,
        CONSTRAINT "PK_equipo_perfiles_funciones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_perfiles_funciones_codigo" UNIQUE ("codigo_importacion")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "equipo_vinculaciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "persona_id" uuid NOT NULL,
        "cargo_id" uuid NOT NULL,
        "contrato_interadministrativo_id" uuid NOT NULL,
        "objeto_contrato_id" uuid,
        "justificacion_id" uuid,
        "perfil_funcion_id" uuid,
        "grupo" "public"."equipo_cargos_grupo_enum" NOT NULL,
        "tipo_vinculacion" "public"."equipo_vinculaciones_tipo_vinculacion_enum" NOT NULL,
        "dedicacion" "public"."equipo_vinculaciones_dedicacion_enum",
        "forma_pago" "public"."equipo_vinculaciones_forma_pago_enum",
        "fecha_inicio" date,
        "fecha_fin" date,
        "monto" numeric(14,2),
        "horario" character varying(100),
        "estado_vinculacion" "public"."equipo_vinculaciones_estado_vinculacion_enum" NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "actualizado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipo_vinculaciones" PRIMARY KEY ("id"),
        CONSTRAINT "FK_equipo_vinculaciones_persona" FOREIGN KEY ("persona_id")
          REFERENCES "equipo_interno_personas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipo_vinculaciones_cargo" FOREIGN KEY ("cargo_id")
          REFERENCES "equipo_cargos"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_contrato" FOREIGN KEY ("contrato_interadministrativo_id")
          REFERENCES "equipo_contratos_interadministrativos"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_objeto_contrato" FOREIGN KEY ("objeto_contrato_id")
          REFERENCES "equipo_objetos_contrato"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_justificacion" FOREIGN KEY ("justificacion_id")
          REFERENCES "equipo_justificaciones"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_perfil_funcion" FOREIGN KEY ("perfil_funcion_id")
          REFERENCES "equipo_perfiles_funciones"("id"),
        CONSTRAINT "UQ_equipo_vinculaciones_persona_contrato_cargo_fecha"
          UNIQUE ("persona_id", "contrato_interadministrativo_id", "cargo_id", "fecha_inicio")
      )
    `);
  }
}
