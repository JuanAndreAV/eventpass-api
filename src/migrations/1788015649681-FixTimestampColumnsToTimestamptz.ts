import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTimestampColumnsToTimestamptz1788015649681 implements MigrationInterface {

    private readonly columnas: [string, string][] = [
        ['accesos_log', 'fechaEscaneo'],
        ['accesos_log', 'registrado_en_servidor'],
        ['asistentes', 'actualizadoEn'],
        ['asistentes', 'fechaIngreso'],
        ['asistentes', 'fechaInscripcion'],
        ['escuelas', 'actualizado_en'],
        ['escuelas', 'creadoEn'],
        ['estudiantes', 'created_at'],
        ['estudiantes', 'updated_at'],
        ['eventos', 'creadoEn'],
        ['eventos', 'fechaInicio'],
        ['roles', 'created_at'],
        ['roles', 'updated_at'],
        ['usuarios', 'created_at'],
        ['usuarios', 'updated_at'],
        ['validaciones_identidad', 'fecha'],
    ];

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const [tabla, columna] of this.columnas) {
            await queryRunner.query(`
                ALTER TABLE ${tabla}
                ALTER COLUMN "${columna}" TYPE timestamptz
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const [tabla, columna] of this.columnas) {
            await queryRunner.query(`
                ALTER TABLE ${tabla}
                ALTER COLUMN "${columna}" TYPE timestamp
            `);
        }
    }

}