import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckConstraintAccesosLog1755900000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accesos_log"
      ADD CONSTRAINT "CHK_accesos_log_asistente_o_estudiante"
      CHECK ("asistente_id" IS NOT NULL OR "estudiante_id" IS NOT NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accesos_log"
      DROP CONSTRAINT "CHK_accesos_log_asistente_o_estudiante"
    `);
  }
}