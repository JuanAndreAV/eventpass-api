// 1760560000000-AsistenteEmailTelefonoNullable.ts
//
// Archivo creado después de que la migración ya corrió contra la base
// compartida (la ejecutó un compañero directo, sin commitear el archivo).
// El nombre y el timestamp son exactamente los que ya están registrados en
// la tabla "migrations", así que TypeORM no la vuelve a correr — esto es
// solo para dejarla documentada y que una base nueva quede igual.
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AsistenteEmailTelefonoNullable1760560000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Un asistente tipo ESTUDIANTE toma el correo/teléfono de su registro de
    // Estudiante, que ya son opcionales ahí: exigirlos NOT NULL en asistentes
    // rompía la inscripción de un estudiante sin esos datos registrados.
    await queryRunner.query(`
      ALTER TABLE "asistentes"
      ALTER COLUMN "email" DROP NOT NULL,
      ALTER COLUMN "telefono" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir puede fallar si ya existen filas con email/telefono en NULL
    // (justo el caso que esta migración habilitó); si pasa, hay que
    // completarlas o borrarlas a mano antes de reintentar.
    await queryRunner.query(`
      ALTER TABLE "asistentes"
      ALTER COLUMN "email" SET NOT NULL,
      ALTER COLUMN "telefono" SET NOT NULL
    `);
  }
}
