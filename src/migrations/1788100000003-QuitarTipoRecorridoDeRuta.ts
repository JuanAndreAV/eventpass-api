import { MigrationInterface, QueryRunner } from 'typeorm';

// Toda ruta hace ida y regreso: el recorrido no es una propiedad que distinga
// unas rutas de otras. Lo que varía es qué trayectos pide cada estudiante.
export class QuitarTipoRecorridoDeRuta1788100000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transporte_rutas" DROP COLUMN "tipo_recorrido"`);
    await queryRunner.query(`DROP TYPE "transporte_rutas_tipo_recorrido_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "transporte_rutas_tipo_recorrido_enum" AS ENUM ('IDA_Y_REGRESO', 'SOLO_IDA')
    `);
    await queryRunner.query(`
      ALTER TABLE "transporte_rutas"
        ADD COLUMN "tipo_recorrido" "transporte_rutas_tipo_recorrido_enum" NOT NULL DEFAULT 'IDA_Y_REGRESO'
    `);
  }
}
