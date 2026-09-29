import { MigrationInterface, QueryRunner } from 'typeorm';

// Ajustes pedidos por la RMM sobre la operación 2026:
//  1. Falta la Escuela de Música Santo Domingo Savio en el catálogo de escuelas.
//  2. La Ruta 11 (Coro Inicial) hace un único recorrido: no tiene regreso.
//  3. La camioneta se cobra por hora ($50.000) con un mínimo de 4 horas.
//  4. El Ensamble Neuro puede viajar con acompañante, que ocupa un puesto más.
//  5. El catálogo de agrupaciones estaba incompleto: son doce, no cinco.
const AGRUPACIONES_FALTANTES: Array<{ nombre: string; codigo: string }> = [
  { nombre: 'Coro de Familias', codigo: 'CORFAM' },
  { nombre: 'Coro Juvenil', codigo: 'CORJUV' },
  { nombre: 'Ensamble de Músicas Populares', codigo: 'EMP' },
  { nombre: 'Orquesta de Tango', codigo: 'OTANGO' },
  { nombre: 'Orquesta Sinfónica Juvenil', codigo: 'OSJ' },
  { nombre: 'Semillero de Músicas Populares', codigo: 'SMP' },
  { nombre: 'Semillero de Tango', codigo: 'STANGO' },
];

// $50.000 por hora con un mínimo de 4 horas de servicio. Como el mínimo es lo que
// se factura siempre, la tarifa queda plana en 200.000 y no se modela la hora.
const VALOR_HORA_CAMIONETA = 50000;
const HORAS_MINIMAS_CAMIONETA = 4;
const TARIFA_CAMIONETA = VALOR_HORA_CAMIONETA * HORAS_MINIMAS_CAMIONETA;

const TARIFA_CAMIONETA_ANTERIOR = 400000;

export class AjustesOperacion20261788100000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Escuela faltante. Queda sin ruta para que el administrador la asigne
    //    desde la pantalla de rutas, que es justo lo que se pidió.
    await queryRunner.query(`
      INSERT INTO "escuelas" ("nombre", "codigo", "activa")
      VALUES ('Escuela de Música Santo Domingo Savio', 'EMSANTODOMINGOSAVIO', true)
      ON CONFLICT ("codigo") DO NOTHING
    `);

    // 2. Rutas de un solo sentido.
    await queryRunner.query(`
      ALTER TABLE "transporte_rutas"
      ADD COLUMN "solo_ida" BOOLEAN NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "transporte_rutas" SET "solo_ida" = true WHERE "codigo" = 'R11'
    `);

    // 3. Camioneta por hora, mínimo cuatro.
    await queryRunner.query(`
      UPDATE "transporte_tarifas" t
      SET "valor" = ${TARIFA_CAMIONETA}
      FROM "transporte_tipos_vehiculo" tv
      WHERE tv."id" = t."tipo_vehiculo_id" AND tv."nombre" = 'CAMIONETA'
    `);

    // 4. Acompañante: se habilita por agrupación y se registra por solicitud.
    await queryRunner.query(`
      ALTER TABLE "transporte_agrupaciones"
      ADD COLUMN "permite_acompanante" BOOLEAN NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "transporte_agrupaciones" SET "permite_acompanante" = true WHERE "codigo" = 'NEURO'
    `);
    await queryRunner.query(`
      ALTER TABLE "transporte_solicitudes"
      ADD COLUMN "lleva_acompanante" BOOLEAN NOT NULL DEFAULT false
    `);

    // 5. Las siete agrupaciones que faltaban.
    for (const agrupacion of AGRUPACIONES_FALTANTES) {
      await queryRunner.query(
        `INSERT INTO "transporte_agrupaciones" ("nombre", "codigo", "activa")
         VALUES ($1, $2, true)
         ON CONFLICT ("codigo") DO NOTHING`,
        [agrupacion.nombre, agrupacion.codigo],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "transporte_agrupaciones" WHERE "codigo" = ANY($1)`,
      [AGRUPACIONES_FALTANTES.map((a) => a.codigo)],
    );

    await queryRunner.query(`ALTER TABLE "transporte_solicitudes" DROP COLUMN "lleva_acompanante"`);
    await queryRunner.query(`ALTER TABLE "transporte_agrupaciones" DROP COLUMN "permite_acompanante"`);

    await queryRunner.query(`
      UPDATE "transporte_tarifas" t
      SET "valor" = ${TARIFA_CAMIONETA_ANTERIOR}
      FROM "transporte_tipos_vehiculo" tv
      WHERE tv."id" = t."tipo_vehiculo_id" AND tv."nombre" = 'CAMIONETA'
    `);

    await queryRunner.query(`ALTER TABLE "transporte_rutas" DROP COLUMN "solo_ida"`);

    await queryRunner.query(`DELETE FROM "escuelas" WHERE "codigo" = 'EMSANTODOMINGOSAVIO'`);
  }
}
