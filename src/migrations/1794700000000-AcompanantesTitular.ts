import { MigrationInterface, QueryRunner } from 'typeorm';

// Acompañantes del Concierto 30 años: cada acompañante es un asistente más (con su
// documento, comuna y QR propio, así el escáner lo valida igual que a cualquiera) y
// titular_id apunta al estudiante que lo inscribió.
//
// Solo AGREGA una columna nula y un índice: ninguna fila existente cambia y el código
// que no conoce titular_id (el desplegado hoy) sigue funcionando igual.
export class AcompanantesTitular1794700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SET LOCAL lock_timeout = '5s'`);

    // ON DELETE CASCADE: si se borra la inscripción del titular, sus acompañantes
    // no quedan huérfanos ocupando cupo.
    await queryRunner.query(`
      ALTER TABLE asistentes
        ADD COLUMN IF NOT EXISTS titular_id uuid REFERENCES asistentes(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asistentes_titular_id ON asistentes (titular_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_asistentes_titular_id`);
    await queryRunner.query(`ALTER TABLE asistentes DROP COLUMN IF EXISTS titular_id`);
  }
}
