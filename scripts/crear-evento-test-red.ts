// Crea un evento de prueba con formulario de red activo, imprime su id.
// Uso: npx ts-node -r tsconfig-paths/register scripts/crear-evento-test-red.ts
import { AppDataSource } from '../src/data-source';
import { Evento, TipoEvento } from '../src/eventos/entities/evento.entity';

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Evento);
  const evento = await repo.save(repo.create({
    nombre: 'TEST_E2E_INSCRIPCION_RED (borrar)',
    tipo: TipoEvento.INSTITUCIONAL,
    fechaInicio: new Date(Date.now() + 86400000),
    activo: true,
    usaFormularioRed: true,
    cupoNinosMusica: 2,
    cupoJovenesMusica: 2,
    cupoLaboratorioRed: 2,
    cupoRpac: 2,
    cupoEquipoInterno: 2,
  }));
  console.log(evento.id);
  await AppDataSource.destroy();
}
main();
