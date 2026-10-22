// Borra el evento de prueba E2E (y su inscripción, por el ON DELETE CASCADE).
// Uso: npx ts-node -r tsconfig-paths/register scripts/borrar-evento-test-red.ts <eventoId>
import { AppDataSource } from '../src/data-source';

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('Falta el eventoId como argumento');
  await AppDataSource.initialize();
  await AppDataSource.query(`DELETE FROM eventos WHERE id = $1`, [id]);
  console.log('Borrado:', id);
  await AppDataSource.destroy();
}
main();
