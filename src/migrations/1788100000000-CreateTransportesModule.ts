import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransportesModule1788100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "transporte_rutas_tipo_recorrido_enum" AS ENUM ('IDA_Y_REGRESO', 'SOLO_IDA')
    `);
    await queryRunner.query(`
      CREATE TYPE "transporte_ciclos_estado_enum" AS ENUM ('BORRADOR', 'ABIERTO', 'CERRADO', 'PROCESADO')
    `);
    await queryRunner.query(`
      CREATE TYPE "transporte_solicitudes_estado_enum" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA')
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_zonas" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" VARCHAR(100) NOT NULL,
        "descripcion" TEXT,
        "activa" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transporte_zonas_nombre" UNIQUE ("nombre")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_tipos_vehiculo" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" VARCHAR(100) NOT NULL,
        "puestos_min" INTEGER NOT NULL,
        "puestos_max" INTEGER NOT NULL,
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transporte_tipos_vehiculo_nombre" UNIQUE ("nombre"),
        CONSTRAINT "CHK_transporte_tipos_vehiculo_rango" CHECK ("puestos_min" >= 1 AND "puestos_max" >= "puestos_min")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_tarifas" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "zona_id" UUID NOT NULL,
        "tipo_vehiculo_id" UUID NOT NULL,
        "valor" NUMERIC(12,2) NOT NULL,
        "vigente_desde" DATE NOT NULL,
        "activa" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_transporte_tarifas_zona"
          FOREIGN KEY ("zona_id") REFERENCES "transporte_zonas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transporte_tarifas_tipo_vehiculo"
          FOREIGN KEY ("tipo_vehiculo_id") REFERENCES "transporte_tipos_vehiculo"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tarifa_zona_vehiculo_vigencia" UNIQUE ("zona_id", "tipo_vehiculo_id", "vigente_desde"),
        CONSTRAINT "CHK_transporte_tarifas_valor" CHECK ("valor" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_instrumentos" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" VARCHAR(100) NOT NULL,
        "puestos_adicionales" INTEGER NOT NULL DEFAULT 0,
        "activo" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transporte_instrumentos_nombre" UNIQUE ("nombre"),
        CONSTRAINT "CHK_transporte_instrumentos_puestos" CHECK ("puestos_adicionales" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_agrupaciones" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" VARCHAR(150) NOT NULL,
        "codigo" VARCHAR(50) NOT NULL,
        "destino_especial" VARCHAR(200),
        "requiere_marca_distintiva" BOOLEAN NOT NULL DEFAULT false,
        "activa" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transporte_agrupaciones_nombre" UNIQUE ("nombre"),
        CONSTRAINT "UQ_transporte_agrupaciones_codigo" UNIQUE ("codigo")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_rutas" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" VARCHAR(150) NOT NULL,
        "codigo" VARCHAR(50) NOT NULL,
        "zona_id" UUID NOT NULL,
        "tipo_recorrido" "transporte_rutas_tipo_recorrido_enum" NOT NULL DEFAULT 'IDA_Y_REGRESO',
        "hora_recogida" TIME,
        "activa" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transporte_rutas_codigo" UNIQUE ("codigo"),
        CONSTRAINT "FK_transporte_rutas_zona"
          FOREIGN KEY ("zona_id") REFERENCES "transporte_zonas"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_escuela_ruta" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "escuela_id" UUID NOT NULL,
        "ruta_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_transporte_escuela_ruta_escuela"
          FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transporte_escuela_ruta_ruta"
          FOREIGN KEY ("ruta_id") REFERENCES "transporte_rutas"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_transporte_escuela_ruta_escuela" UNIQUE ("escuela_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_ciclos" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nombre" VARCHAR(200) NOT NULL,
        "fecha_evento" TIMESTAMPTZ NOT NULL,
        "destino" VARCHAR(200) NOT NULL,
        "fecha_cierre" TIMESTAMPTZ NOT NULL,
        "estado" "transporte_ciclos_estado_enum" NOT NULL DEFAULT 'BORRADOR',
        "observaciones" TEXT,
        "creado_por_id" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_transporte_ciclos_creado_por"
          FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_ciclos_agrupaciones" (
        "ciclo_id" UUID NOT NULL,
        "agrupacion_id" UUID NOT NULL,
        PRIMARY KEY ("ciclo_id", "agrupacion_id"),
        CONSTRAINT "FK_transporte_ciclos_agrupaciones_ciclo"
          FOREIGN KEY ("ciclo_id") REFERENCES "transporte_ciclos"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transporte_ciclos_agrupaciones_agrupacion"
          FOREIGN KEY ("agrupacion_id") REFERENCES "transporte_agrupaciones"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transporte_solicitudes" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ciclo_id" UUID NOT NULL,
        "estudiante_id" UUID NOT NULL,
        "escuela_id" UUID NOT NULL,
        "agrupacion_id" UUID NOT NULL,
        "lleva_instrumento" BOOLEAN NOT NULL DEFAULT false,
        "instrumento_id" UUID,
        "requiere_ida" BOOLEAN NOT NULL DEFAULT false,
        "escuela_salida_id" UUID,
        "requiere_regreso" BOOLEAN NOT NULL DEFAULT false,
        "escuela_llegada_id" UUID,
        "telefono_contacto" VARCHAR(20),
        "telefono_acudiente" VARCHAR(20),
        "observacion" TEXT,
        "estado" "transporte_solicitudes_estado_enum" NOT NULL DEFAULT 'PENDIENTE',
        "motivo_rechazo" TEXT,
        "revisada_por_id" UUID,
        "revisada_en" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_transporte_solicitudes_ciclo"
          FOREIGN KEY ("ciclo_id") REFERENCES "transporte_ciclos"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transporte_solicitudes_estudiante"
          FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transporte_solicitudes_escuela"
          FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_transporte_solicitudes_agrupacion"
          FOREIGN KEY ("agrupacion_id") REFERENCES "transporte_agrupaciones"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_transporte_solicitudes_instrumento"
          FOREIGN KEY ("instrumento_id") REFERENCES "transporte_instrumentos"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_transporte_solicitudes_escuela_salida"
          FOREIGN KEY ("escuela_salida_id") REFERENCES "escuelas"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_transporte_solicitudes_escuela_llegada"
          FOREIGN KEY ("escuela_llegada_id") REFERENCES "escuelas"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_transporte_solicitudes_revisada_por"
          FOREIGN KEY ("revisada_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_solicitud_ciclo_estudiante" UNIQUE ("ciclo_id", "estudiante_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transporte_solicitudes_ciclo_estado"
        ON "transporte_solicitudes" ("ciclo_id", "estado")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transporte_solicitudes_escuela"
        ON "transporte_solicitudes" ("escuela_id")
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("codigo", "nombre", "descripcion") VALUES
        ('SECRETARIA', 'Secretaria de escuela', 'Aprueba o rechaza las solicitudes de transporte de su propia escuela'),
        ('TRANSPORTADORA', 'Empresa de transporte', 'Registra vehículos, guías, abordajes y novedades del servicio')
      ON CONFLICT ("codigo") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "roles" WHERE "codigo" IN ('SECRETARIA', 'TRANSPORTADORA')`);
    await queryRunner.query(`DROP TABLE "transporte_solicitudes"`);
    await queryRunner.query(`DROP TABLE "transporte_ciclos_agrupaciones"`);
    await queryRunner.query(`DROP TABLE "transporte_ciclos"`);
    await queryRunner.query(`DROP TABLE "transporte_escuela_ruta"`);
    await queryRunner.query(`DROP TABLE "transporte_rutas"`);
    await queryRunner.query(`DROP TABLE "transporte_agrupaciones"`);
    await queryRunner.query(`DROP TABLE "transporte_instrumentos"`);
    await queryRunner.query(`DROP TABLE "transporte_tarifas"`);
    await queryRunner.query(`DROP TABLE "transporte_tipos_vehiculo"`);
    await queryRunner.query(`DROP TABLE "transporte_zonas"`);
    await queryRunner.query(`DROP TYPE "transporte_solicitudes_estado_enum"`);
    await queryRunner.query(`DROP TYPE "transporte_ciclos_estado_enum"`);
    await queryRunner.query(`DROP TYPE "transporte_rutas_tipo_recorrido_enum"`);
  }
}
