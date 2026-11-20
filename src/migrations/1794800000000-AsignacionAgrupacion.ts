import { MigrationInterface, QueryRunner } from 'typeorm';

// Permite asignar un cargo a una agrupación integrada (directores, apoyos y
// artistas formadores de agrupaciones), además de a una escuela.
// Cada fila de equipo_asignaciones apunta a lo sumo a un lugar: una escuela,
// una agrupación o ninguno. Varias escuelas/agrupaciones = varias filas.
export class AsignacionAgrupacion1794800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE equipo_asignaciones
        ADD COLUMN IF NOT EXISTS agrupacion_id uuid
          REFERENCES agrupaciones_integradas(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipo_asignaciones_agrupacion
        ON equipo_asignaciones (agrupacion_id)
    `);

    // El índice único original no contemplaba la agrupación: sin este cambio
    // no se podría asignar el mismo cargo en dos agrupaciones distintas.
    await queryRunner.query(`DROP INDEX IF EXISTS uq_equipo_asignacion`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_equipo_asignacion
        ON equipo_asignaciones (persona_id, cargo_id, escuela_id, agrupacion_id) NULLS NOT DISTINCT
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_equipo_asignacion_un_lugar'
        ) THEN
          ALTER TABLE equipo_asignaciones
            ADD CONSTRAINT chk_equipo_asignacion_un_lugar
            CHECK (escuela_id IS NULL OR agrupacion_id IS NULL);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE equipo_asignaciones DROP CONSTRAINT IF EXISTS chk_equipo_asignacion_un_lugar`,
    );
    // Las filas que solo se diferencian por agrupación chocarían con el índice
    // original: se eliminan antes de restaurarlo.
    await queryRunner.query(`DELETE FROM equipo_asignaciones WHERE agrupacion_id IS NOT NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_equipo_asignacion`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_equipo_asignacion
        ON equipo_asignaciones (persona_id, cargo_id, escuela_id) NULLS NOT DISTINCT
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipo_asignaciones_agrupacion`);
    await queryRunner.query(`ALTER TABLE equipo_asignaciones DROP COLUMN IF EXISTS agrupacion_id`);
  }
}
