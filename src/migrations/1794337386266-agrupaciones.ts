
import { MigrationInterface, QueryRunner } from "typeorm";

export class Agrupaciones1794337386266 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        // 1. Crear tabla agrupaciones_integradas
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS agrupaciones_integradas (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                nombre varchar(150) NOT NULL UNIQUE,
                descripcion text,
                activa boolean NOT NULL DEFAULT true,
                creado_en timestamptz NOT NULL DEFAULT now(),
                actualizado_en timestamptz NOT NULL DEFAULT now()
            );
        `);

        // 2. Crear tabla estudiantes_agrupacion
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS estudiantes_agrupacion (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                estudiante_id uuid NOT NULL,
                agrupacion_id uuid NOT NULL,
                activo boolean NOT NULL DEFAULT true,
                creado_en timestamptz NOT NULL DEFAULT now(),
                actualizado_en timestamptz NOT NULL DEFAULT now(),

                CONSTRAINT fk_estudiante_agrupacion_estudiante
                    FOREIGN KEY (estudiante_id)
                    REFERENCES estudiantes(id)
                    ON DELETE CASCADE,

                CONSTRAINT fk_estudiante_agrupacion_agrupacion
                    FOREIGN KEY (agrupacion_id)
                    REFERENCES agrupaciones_integradas(id)
                    ON DELETE CASCADE,

                CONSTRAINT uq_estudiante_agrupacion
                    UNIQUE (estudiante_id, agrupacion_id)
            );
        `);

        // 3. Crear índices
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_estudiantes_agrupacion_estudiante
            ON estudiantes_agrupacion(estudiante_id);
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_estudiantes_agrupacion_agrupacion
            ON estudiantes_agrupacion(agrupacion_id);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`
            DROP TABLE IF EXISTS estudiantes_agrupacion;
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS agrupaciones_integradas;
        `);
    }
}
