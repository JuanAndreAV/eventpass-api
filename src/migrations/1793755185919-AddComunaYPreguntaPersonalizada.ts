import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComunaYPreguntaPersonalizada1793755185919 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "asistentes" ADD COLUMN IF NOT EXISTS "comuna" varchar(100)`);
    await queryRunner.query(`ALTER TABLE "asistentes" ADD COLUMN IF NOT EXISTS "respuesta_pregunta" text`);
    await queryRunner.query(`ALTER TABLE "eventos" ADD COLUMN IF NOT EXISTS "pregunta_personalizada" varchar(300)`);
}

public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "eventos" DROP COLUMN IF EXISTS "pregunta_personalizada"`);
    await queryRunner.query(`ALTER TABLE "asistentes" DROP COLUMN IF EXISTS "respuesta_pregunta"`);
    await queryRunner.query(`ALTER TABLE "asistentes" DROP COLUMN IF EXISTS "comuna"`);
}

}
