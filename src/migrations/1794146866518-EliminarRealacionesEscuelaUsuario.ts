import { MigrationInterface, QueryRunner } from "typeorm";

export class EliminarRealacionesEscuelaUsuario1794146866518 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS escuela_formadores;`);
        await queryRunner.query(`
            ALTER TABLE escuelas DROP COLUMN IF EXISTS director_id;`);
        await queryRunner.query(`
            ALTER TABLE escuelas DROP COLUMN IF EXISTS apoyo_administrativo_id;`);    
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
         await queryRunner.query(`
      ALTER TABLE escuelas
        ADD COLUMN IF NOT EXISTS director_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS apoyo_administrativo_id uuid REFERENCES usuarios(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS escuelas_formadores (
        escuela_id uuid NOT NULL REFERENCES escuelas(id) ON DELETE CASCADE,
        formador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        PRIMARY KEY (escuela_id, formador_id)
      )
    `);
  }

}
