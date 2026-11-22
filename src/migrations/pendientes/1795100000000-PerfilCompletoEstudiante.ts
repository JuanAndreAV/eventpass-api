import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PENDIENTE — BORRADOR PARA REVISAR. NO SE EJECUTA TODAVÍA.
 *
 * Vive en src/migrations/pendientes/, fuera del patrón `src/migrations/*` de
 * data-source.ts, así que `npm run migration:run` la ignora. Para activarla:
 *   1. Revisar/ajustar la lista de campos con el área académica y social.
 *   2. Moverla a src/migrations/ (con un timestamp mayor que la última migración).
 *   3. Backup → `npm run migration:run` (el .env apunta a producción).
 *   4. Recién entonces mapear las columnas en Estudiante, los DTO, la vista
 *      `aVistaGestion` del servicio y el formulario del panel de gestión.
 *      Mapearlas antes de correr la migración rompe todas las consultas de
 *      estudiantes (columna inexistente → 500).
 *
 * Todo es nullable o con default: los estudiantes existentes no se tocan.
 */
export class PerfilCompletoEstudiante1795100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_estudiante_enum') THEN
          CREATE TYPE estado_estudiante_enum AS ENUM ('ACTIVO', 'INACTIVO', 'RETIRADO', 'EGRESADO');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE estudiantes
        -- Estado en la Red
        ADD COLUMN IF NOT EXISTS estado estado_estudiante_enum NOT NULL DEFAULT 'ACTIVO',
        ADD COLUMN IF NOT EXISTS fecha_ingreso date,
        ADD COLUMN IF NOT EXISTS fecha_retiro date,
        ADD COLUMN IF NOT EXISTS motivo_retiro text,
        ADD COLUMN IF NOT EXISTS nivel_formativo varchar(50),
        ADD COLUMN IF NOT EXISTS tiene_instrumento_propio boolean,

        -- Datos personales y de ubicación
        ADD COLUMN IF NOT EXISTS genero varchar(30),
        ADD COLUMN IF NOT EXISTS comuna varchar(100),
        ADD COLUMN IF NOT EXISTS barrio varchar(100),
        ADD COLUMN IF NOT EXISTS estrato smallint,

        -- Salud
        ADD COLUMN IF NOT EXISTS eps varchar(100),
        ADD COLUMN IF NOT EXISTS regimen_salud varchar(30),
        ADD COLUMN IF NOT EXISTS grupo_sanguineo varchar(5),
        ADD COLUMN IF NOT EXISTS condicion_discapacidad text,

        -- Enfoque diferencial
        ADD COLUMN IF NOT EXISTS grupo_etnico varchar(50),

        -- Escolaridad
        ADD COLUMN IF NOT EXISTS institucion_educativa varchar(150),
        ADD COLUMN IF NOT EXISTS grado_escolar varchar(20),
        ADD COLUMN IF NOT EXISTS jornada_escolar varchar(20),

        -- Acudiente (obligatorio en la práctica para menores de edad)
        ADD COLUMN IF NOT EXISTS acudiente_nombre varchar(200),
        ADD COLUMN IF NOT EXISTS acudiente_tipo_documento tipo_documento_enum,
        ADD COLUMN IF NOT EXISTS acudiente_documento varchar(20),
        ADD COLUMN IF NOT EXISTS acudiente_parentesco varchar(50),
        ADD COLUMN IF NOT EXISTS acudiente_telefono varchar(20),
        ADD COLUMN IF NOT EXISTS acudiente_email varchar(150),

        -- Contacto de emergencia (si es distinto del acudiente)
        ADD COLUMN IF NOT EXISTS emergencia_nombre varchar(200),
        ADD COLUMN IF NOT EXISTS emergencia_telefono varchar(20),

        -- Autorizaciones (Ley 1581 de 2012: tratamiento de datos de menores)
        ADD COLUMN IF NOT EXISTS autoriza_tratamiento_datos boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS autoriza_uso_imagen boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS fecha_autorizacion timestamptz,

        ADD COLUMN IF NOT EXISTS observaciones text
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_estudiantes_estrato') THEN
          ALTER TABLE estudiantes
            ADD CONSTRAINT chk_estudiantes_estrato CHECK (estrato IS NULL OR estrato BETWEEN 1 AND 6);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_estudiantes_fechas_retiro') THEN
          ALTER TABLE estudiantes
            ADD CONSTRAINT chk_estudiantes_fechas_retiro
            CHECK (fecha_retiro IS NULL OR fecha_ingreso IS NULL OR fecha_retiro >= fecha_ingreso);
        END IF;
      END $$;
    `);

    // Filtros habituales del panel de gestión
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_estudiantes_escuela_id ON estudiantes (escuela_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_estudiantes_estado ON estudiantes (estado)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_estudiantes_estado`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_estudiantes_escuela_id`);
    await queryRunner.query(`
      ALTER TABLE estudiantes
        DROP CONSTRAINT IF EXISTS chk_estudiantes_fechas_retiro,
        DROP CONSTRAINT IF EXISTS chk_estudiantes_estrato,
        DROP COLUMN IF EXISTS observaciones,
        DROP COLUMN IF EXISTS fecha_autorizacion,
        DROP COLUMN IF EXISTS autoriza_uso_imagen,
        DROP COLUMN IF EXISTS autoriza_tratamiento_datos,
        DROP COLUMN IF EXISTS emergencia_telefono,
        DROP COLUMN IF EXISTS emergencia_nombre,
        DROP COLUMN IF EXISTS acudiente_email,
        DROP COLUMN IF EXISTS acudiente_telefono,
        DROP COLUMN IF EXISTS acudiente_parentesco,
        DROP COLUMN IF EXISTS acudiente_documento,
        DROP COLUMN IF EXISTS acudiente_tipo_documento,
        DROP COLUMN IF EXISTS acudiente_nombre,
        DROP COLUMN IF EXISTS jornada_escolar,
        DROP COLUMN IF EXISTS grado_escolar,
        DROP COLUMN IF EXISTS institucion_educativa,
        DROP COLUMN IF EXISTS grupo_etnico,
        DROP COLUMN IF EXISTS condicion_discapacidad,
        DROP COLUMN IF EXISTS grupo_sanguineo,
        DROP COLUMN IF EXISTS regimen_salud,
        DROP COLUMN IF EXISTS eps,
        DROP COLUMN IF EXISTS estrato,
        DROP COLUMN IF EXISTS barrio,
        DROP COLUMN IF EXISTS comuna,
        DROP COLUMN IF EXISTS genero,
        DROP COLUMN IF EXISTS tiene_instrumento_propio,
        DROP COLUMN IF EXISTS nivel_formativo,
        DROP COLUMN IF EXISTS motivo_retiro,
        DROP COLUMN IF EXISTS fecha_retiro,
        DROP COLUMN IF EXISTS fecha_ingreso,
        DROP COLUMN IF EXISTS estado
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS estado_estudiante_enum`);
  }
}
