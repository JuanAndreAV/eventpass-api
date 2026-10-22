// 1792800000000-InscripcionRedEdadNullable.ts
//
// equipo_interno_personas no tiene fecha de nacimiento (no se pidió en el
// Excel de origen), así que al confirmar una inscripción de equipo interno
// con un solo clic no hay de dónde sacar una edad real. edad solo la usa
// determinarCategoria para los tramos NINOS_MUSICA/JOVENES_MUSICA (rol
// Participante/Artista Formador en Música) — EQUIPO_INTERNO no la necesita
// para nada, así que se vuelve nullable en vez de inventar un valor.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InscripcionRedEdadNullable1792800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inscripciones_red" ALTER COLUMN "edad" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inscripciones_red" ALTER COLUMN "edad" SET NOT NULL`);
  }
}
