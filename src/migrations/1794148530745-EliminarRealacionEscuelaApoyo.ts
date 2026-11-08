import { MigrationInterface, QueryRunner } from "typeorm";

export class EliminarRealacionEscuelaApoyo1794148530745 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE escuelas DROP COLUMN IF EXISTS apoyo_administrativo_id;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `
            ALTER TABLE escuelas ADD COLUMN IF NOT EXISTS apoyo_administrativo_id uuid REFERENCES usuarios(id) ON DELETE SET NULL`
        )
    }

}
