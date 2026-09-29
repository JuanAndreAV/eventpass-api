import { MigrationInterface, QueryRunner } from 'typeorm';

// En el Excel la hora de recogida y la de regreso son un único dato del evento
// ('1. Costo del servicio'!C28 y D28) que todas las hojas de ruta leen; no son
// un atributo de la ruta. Además son texto libre porque combinan varios horarios
// ("7:30 A.M. RURAL Y 8:00 A.M. URBANA").
export class MoverHorariosAlCiclo1788100000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transporte_ciclos"
        ADD COLUMN "hora_recogida" VARCHAR(200),
        ADD COLUMN "hora_regreso" VARCHAR(200)
    `);
    await queryRunner.query(`ALTER TABLE "transporte_rutas" DROP COLUMN "hora_recogida"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transporte_rutas" ADD COLUMN "hora_recogida" TIME`);
    await queryRunner.query(`
      ALTER TABLE "transporte_ciclos"
        DROP COLUMN "hora_regreso",
        DROP COLUMN "hora_recogida"
    `);
  }
}
