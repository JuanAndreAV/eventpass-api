import { MigrationInterface, QueryRunner } from "typeorm";

export class InscripcionPrivada1794573230454 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<void> {
    // Seguridad en producción: si no consigue el bloqueo de una tabla en 5 s (por ejemplo
    // porque hay una transacción larga), falla y se deshace, en vez de quedarse esperando
    // y dejar en cola las consultas de la app. Se puede volver a correr.
    await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);
 
    // 0) eventos.visible: controla solo el LISTADO público. DEFAULT true, así que todos
    //    los eventos que ya existen siguen apareciendo exactamente igual.
    await queryRunner.query(`
      ALTER TABLE eventos ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true
    `);
 
    // 1) Configuración de un evento de inscripción privada (1 a 1 con eventos)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS evento_inscripcion_privada (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        evento_id uuid NOT NULL UNIQUE REFERENCES eventos(id) ON DELETE CASCADE,
        token varchar(64) NOT NULL UNIQUE,
        activa boolean NOT NULL DEFAULT true,
        escuelas_habilitadas boolean NOT NULL DEFAULT true,
        agrupaciones_habilitadas boolean NOT NULL DEFAULT true,
        cupo_por_escuela_defecto int NOT NULL DEFAULT 80 CHECK (cupo_por_escuela_defecto >= 0),
        tope_boletas_por_persona int CHECK (tope_boletas_por_persona IS NULL OR tope_boletas_por_persona >= 1),
        boletas_por_participante int NOT NULL DEFAULT 2 CHECK (boletas_por_participante >= 1),
        creado_en timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now()
      )
    `);
 
    // 2) Cupo de boletas por escuela y evento. El CHECK impide pasarse del cupo
    //    aunque dos inscripciones lleguen al mismo tiempo.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS evento_cupo_escuela (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        evento_id uuid NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
        escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
        cupo int NOT NULL CHECK (cupo >= 0),
        usadas int NOT NULL DEFAULT 0 CHECK (usadas >= 0),
        CONSTRAINT chk_cupo_escuela_usadas CHECK (usadas <= cupo),
        CONSTRAINT uq_cupo_escuela UNIQUE (evento_id, escuela_id)
      )
    `);
 
    // Las tablas nuevas de Supabase quedan expuestas por su API pública si no tienen RLS.
    // evento_inscripcion_privada guarda el token secreto del enlace: se activa RLS sin
    // políticas, lo que bloquea el acceso por la API pública. NestJS no se ve afectado
    // porque se conecta con el rol dueño de las tablas (postgres), que no pasa por RLS.
    await queryRunner.query(`ALTER TABLE evento_inscripcion_privada ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE evento_cupo_escuela ENABLE ROW LEVEL SECURITY`);
 
    // 3) Boletas por inscripción, en asistentes
    await queryRunner.query(`
      ALTER TABLE asistentes
        ADD COLUMN IF NOT EXISTS cantidad_boletas int NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS boletas_ingresadas int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS modalidad varchar(20),
        ADD COLUMN IF NOT EXISTS escuela_id uuid REFERENCES escuelas(id) ON DELETE SET NULL
    `);
 
    // Coherencia con lo que ya existe: quien ya ingresó, ingresó 1 de 1
    await queryRunner.query(`
      UPDATE asistentes SET boletas_ingresadas = 1 WHERE ingresado = true AND boletas_ingresadas = 0
    `);
 
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_asistentes_boletas') THEN
          ALTER TABLE asistentes ADD CONSTRAINT chk_asistentes_boletas
            CHECK (cantidad_boletas >= 1 AND boletas_ingresadas >= 0 AND boletas_ingresadas <= cantidad_boletas);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_asistentes_modalidad') THEN
          ALTER TABLE asistentes ADD CONSTRAINT chk_asistentes_modalidad
            CHECK (modalidad IS NULL OR modalidad IN ('ESCUELA', 'AGRUPACION'));
        END IF;
      END $$;
    `);
 
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asistentes_escuela_id ON asistentes (escuela_id)
    `);
  }
 
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_asistentes_escuela_id`);
    await queryRunner.query(`ALTER TABLE asistentes DROP CONSTRAINT IF EXISTS chk_asistentes_boletas`);
    await queryRunner.query(`ALTER TABLE asistentes DROP CONSTRAINT IF EXISTS chk_asistentes_modalidad`);
    await queryRunner.query(`
      ALTER TABLE asistentes
        DROP COLUMN IF EXISTS escuela_id,
        DROP COLUMN IF EXISTS modalidad,
        DROP COLUMN IF EXISTS boletas_ingresadas,
        DROP COLUMN IF EXISTS cantidad_boletas
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS evento_cupo_escuela`);
    await queryRunner.query(`DROP TABLE IF EXISTS evento_inscripcion_privada`);
    await queryRunner.query(`ALTER TABLE eventos DROP COLUMN IF EXISTS visible`);
  }

}
