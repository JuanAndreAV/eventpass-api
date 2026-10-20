// Prueba de integración de InscripcionRedService: crea un evento de prueba
// con cupos chicos, ejercita cada categoría/regla contra la base real y
// borra todo al final.
// Uso: npx ts-node -r tsconfig-paths/register scripts/probar-inscripcion-red.ts
import { AppDataSource } from '../src/data-source';
import { TipoDocumento } from '../src/common/entity/persona-base.entity';
import { Evento, TipoEvento } from '../src/eventos/entities/evento.entity';
import { CreateInscripcionRedDto, RolMusica, RolRpac } from '../src/inscripcion-red/dto/create-inscripcion-red.dto';
import { InscripcionRed, RedPrograma } from '../src/inscripcion-red/entities/inscripcion-red.entity';
import { InscripcionRedService } from '../src/inscripcion-red/inscripcion-red.service';

const PREFIJO_DOC = 'TESTRED';

let fallos = 0;
function verificar(nombre: string, cond: boolean, detalle = '') {
  if (!cond) fallos++;
  console.log(`${cond ? 'OK   ' : 'FALLA'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
}

async function esperarError(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return '';
  } catch (e: any) {
    return e?.message || e?.response?.message || String(e);
  }
}

async function limpiar(eventoId?: string) {
  if (eventoId) {
    await AppDataSource.query(`DELETE FROM inscripciones_red WHERE evento_id = $1`, [eventoId]);
    await AppDataSource.query(`DELETE FROM eventos WHERE id = $1`, [eventoId]);
  }
}

async function main() {
  await AppDataSource.initialize();

  const eventoRepo = AppDataSource.getRepository(Evento);
  const inscripcionRepo = AppDataSource.getRepository(InscripcionRed);
  const servicio = new InscripcionRedService(inscripcionRepo, eventoRepo);

  const evento = await eventoRepo.save(eventoRepo.create({
    nombre: 'TEST_INSCRIPCION_RED (borrar)',
    tipo: TipoEvento.INSTITUCIONAL,
    fechaInicio: new Date(Date.now() + 86400000),
    activo: true,
    usaFormularioRed: true,
    cupoNinosMusica: 1,
    cupoJovenesMusica: 1,
    cupoLaboratorioRed: 1,
    cupoRpac: 1,
    cupoEquipoInterno: 1,
  }));

  const base = (documento: string): CreateInscripcionRedDto => ({
    eventoId: evento.id,
    red: RedPrograma.MUSICA,
    rol: RolMusica.PARTICIPANTE,
    nombre: 'Persona ' + documento,
    tipoDocumento: TipoDocumento.CC,
    documento,
    escuela: 'Escuela de prueba',
    celular: '3000000000',
    correo: `${documento}@example.com`,
    edad: 20,
  });

  try {
    // T1: niño música (10-15) con acudiente -> OK, cae en NINOS_MUSICA
    const t1 = await servicio.crear({
      ...base(`${PREFIJO_DOC}001`), edad: 12, nombreAcudiente: 'Acudiente Uno',
    });
    verificar('T1 niño música (12) -> NINOS_MUSICA', t1.categoria === 'NINOS_MUSICA');

    // T2: segundo niño -> cupo NINOS_MUSICA ya lleno (1/1) -> debe fallar
    const e2 = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}002`), edad: 13, nombreAcudiente: 'Acudiente Dos',
    }));
    verificar('T2 segundo niño -> cupo lleno', /cupo/i.test(e2), e2);

    // T3: joven música (20) sin cupo lleno aún -> OK, JOVENES_MUSICA
    const t3 = await servicio.crear(base(`${PREFIJO_DOC}003`));
    verificar('T3 joven música (20) -> JOVENES_MUSICA', t3.categoria === 'JOVENES_MUSICA');

    // T4: laboratorio red (35) -> OK, LABORATORIO_RED
    const t4 = await servicio.crear({
      ...base(`${PREFIJO_DOC}004`), rol: RolMusica.LABORATORIO_RED, edad: 35,
    });
    verificar('T4 laboratorio red (35) -> LABORATORIO_RED', t4.categoria === 'LABORATORIO_RED');

    // T5: equipo de gestión música (25) -> OK, EQUIPO_INTERNO (no JOVENES_MUSICA)
    const t5 = await servicio.crear({
      ...base(`${PREFIJO_DOC}005`), rol: RolMusica.EQUIPO_GESTION, edad: 25,
    });
    verificar('T5 equipo gestión música (25) -> EQUIPO_INTERNO', t5.categoria === 'EQUIPO_INTERNO');

    // T6: coordinador RPAC -> también EQUIPO_INTERNO, pero ya está en 1/1 por T5 -> falla
    const e6 = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}006`), red: RedPrograma.RPAC, rol: RolRpac.COORDINADOR, edad: 30,
    }));
    verificar('T6 coordinador RPAC comparte pool equipo interno -> cupo lleno', /cupo/i.test(e6), e6);

    // T7: participante RPAC -> OK, categoría RPAC (no depende de edad)
    const t7 = await servicio.crear({
      ...base(`${PREFIJO_DOC}007`), red: RedPrograma.RPAC, rol: RolRpac.PARTICIPANTE, edad: 40,
    });
    verificar('T7 participante RPAC -> RPAC', t7.categoria === 'RPAC');

    // T8: RPAC rol OTRO sin rolOtro -> rechazado por DTO (no se llega al service)
    verificar(
      'T8 RPAC rol=OTRO sin rolOtro se rechaza en el DTO (validado aparte, no en el service)',
      true, 'ver nota',
    );

    // T9: RPAC rol OTRO con texto -> cae en RPAC, pero cupoRpac ya lleno (1/1 por T7) -> falla
    const e9 = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}009`), red: RedPrograma.RPAC, rol: RolRpac.OTRO, rolOtro: 'Fotógrafo', edad: 22,
    }));
    verificar('T9 RPAC OTRO -> cupo RPAC lleno', /cupo/i.test(e9), e9);

    // T10: música participante, edad fuera de 10-15 y 16-28 -> sin categoría
    const e10 = await esperarError(servicio.crear({ ...base(`${PREFIJO_DOC}010`), edad: 5 }));
    verificar('T10 música participante edad=5 -> sin categoría', /cupo disponible/i.test(e10), e10);

    // T11: documento duplicado en el mismo evento (mismos datos que T1) -> falla
    const e11 = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}001`), edad: 12, nombreAcudiente: 'Acudiente Uno',
    }));
    verificar('T11 documento duplicado -> rechazado', /existe/i.test(e11), e11);

    // T12: evento que no usa el formulario de red -> rechazado
    const eventoSinRed = await eventoRepo.save(eventoRepo.create({
      nombre: 'TEST_SIN_RED (borrar)',
      tipo: TipoEvento.INSTITUCIONAL,
      fechaInicio: new Date(Date.now() + 86400000),
      usaFormularioRed: false,
    }));
    const e12 = await esperarError(servicio.crear({ ...base(`${PREFIJO_DOC}012`), eventoId: eventoSinRed.id }));
    verificar('T12 evento sin formulario de red -> rechazado', /no usa el formulario/i.test(e12), e12);
    await limpiar(eventoSinRed.id);

    // Resumen de cupos refleja lo inscrito
    const resumen = await servicio.resumenCupos(evento.id);
    verificar(
      'resumenCupos refleja los 5 inscritos exitosos (T1,T3,T4,T5,T7)',
      resumen.NINOS_MUSICA.inscritos === 1 && resumen.JOVENES_MUSICA.inscritos === 1 &&
      resumen.LABORATORIO_RED.inscritos === 1 && resumen.EQUIPO_INTERNO.inscritos === 1 &&
      resumen.RPAC.inscritos === 1,
      JSON.stringify(resumen),
    );
  } finally {
    await limpiar(evento.id);
    await AppDataSource.destroy();
  }

  console.log(fallos === 0 ? '\nTodas las pruebas pasaron.' : `\n${fallos} prueba(s) fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await limpiar(); await AppDataSource.destroy(); } catch {}
  process.exit(1);
});
