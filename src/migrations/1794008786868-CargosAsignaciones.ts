import { MigrationInterface, QueryRunner } from "typeorm";

export class CargosAsignaciones1794008786868 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cargos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre varchar NOT NULL UNIQUE,
        categoria varchar NOT NULL,
        requiere_escuela boolean NOT NULL DEFAULT false,
        rol_defecto_id uuid REFERENCES roles(id) ON DELETE SET NULL
      )
    `);

   
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS equipo_asignaciones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        persona_id uuid NOT NULL REFERENCES equipo_interno_personas(id) ON DELETE CASCADE,
        cargo_id uuid NOT NULL REFERENCES cargos(id),
        escuela_id uuid REFERENCES escuelas(id),
        detalle varchar,
        principal boolean NOT NULL DEFAULT true,
        activo boolean NOT NULL DEFAULT true,
        creado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
 
    // Requiere PostgreSQL 15+ (NULLS NOT DISTINCT)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_equipo_asignacion
        ON equipo_asignaciones (persona_id, cargo_id, escuela_id) NULLS NOT DISTINCT
    `);
 
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipo_asignaciones_escuela
        ON equipo_asignaciones (escuela_id)
    `);
 
    await queryRunner.query(`
      ALTER TABLE equipo_interno_personas
        ADD COLUMN IF NOT EXISTS tipo_contrato varchar
    `);
 
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_equipo_tipo_contrato'
        ) THEN
          ALTER TABLE equipo_interno_personas
            ADD CONSTRAINT chk_equipo_tipo_contrato
            CHECK (tipo_contrato IN ('LABORAL', 'PRESTACION_SERVICIOS'));
        END IF;
      END $$;
    `);
  }
 
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE equipo_interno_personas DROP CONSTRAINT IF EXISTS chk_equipo_tipo_contrato`,
    );
    await queryRunner.query(
      `ALTER TABLE equipo_interno_personas DROP COLUMN IF EXISTS tipo_contrato`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS equipo_asignaciones`);
    await queryRunner.query(`DROP TABLE IF EXISTS cargos`);
  }

}
