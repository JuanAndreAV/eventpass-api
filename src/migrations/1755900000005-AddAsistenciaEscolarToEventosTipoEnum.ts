import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAsistenciaEscolarToEventosTipoEnum1755900000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "eventos_tipo_enum" ADD VALUE IF NOT EXISTS 'ASISTENCIA_ESCOLAR'
    `);
  }

  public async down(): Promise<void> {
    // Postgres no soporta quitar un valor de un enum directamente.
    // Si necesitas revertir, hay que recrear el tipo completo (ver nota abajo).
    console.warn(
      'No se puede revertir automáticamente un valor de ENUM en Postgres. ' +
      'Si es necesario, crea una migración manual que reconstruya "eventos_tipo_enum" sin ese valor.',
    );
  }
} 