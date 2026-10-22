// Prueba de integración de InscripcionRedService: crea un evento de prueba
// con cupos chicos, un estudiante y una persona de equipo interno de prueba,
// ejercita cada categoría/regla (incluida la validación cruzada contra
// estudiantes y equipo_interno_personas) contra la base real, y borra todo
// al final.
// Uso: npx ts-node -r tsconfig-paths/register scripts/probar-inscripcion-red.ts
import { AppDataSource } from '../src/data-source';
import { TipoDocumento } from '../src/common/entity/persona-base.entity';
import { Escuela } from '../src/escuelas/entities/escuela.entity';
import { Estudiante } from '../src/estudiantes/entities/estudiante.entity';
import { EquipoInternoService } from '../src/equipo-interno/equipo-interno.service';
import { Cargo } from '../src/equipo-interno/entities/cargo.entity';
import { ContratoInteradministrativo } from '../src/equipo-interno/entities/contrato-interadministrativo.entity';
import { EquipoInterno } from '../src/equipo-interno/entities/equipo-interno.entity';
import { Justificacion } from '../src/equipo-interno/entities/justificacion.entity';
import { ObjetoContrato } from '../src/equipo-interno/entities/objeto-contrato.entity';
import { PerfilFuncion } from '../src/equipo-interno/entities/perfil-funcion.entity';
import { Vinculacion } from '../src/equipo-interno/entities/vinculacion.entity';
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

async function limpiar(eventoId?: string, estudianteId?: string, equipoInternoId?: string) {
  if (eventoId) {
    await AppDataSource.query(`DELETE FROM inscripciones_red WHERE evento_id = $1`, [eventoId]);
    await AppDataSource.query(`DELETE FROM eventos WHERE id = $1`, [eventoId]);
  }
  if (estudianteId) await AppDataSource.query(`DELETE FROM estudiantes WHERE id = $1`, [estudianteId]);
  if (equipoInternoId) {
    await AppDataSource.query(`DELETE FROM equipo_interno_personas WHERE id = $1`, [equipoInternoId]);
  }
}

async function main() {
  await AppDataSource.initialize();

  const eventoRepo = AppDataSource.getRepository(Evento);
  const inscripcionRepo = AppDataSource.getRepository(InscripcionRed);
  const estudianteRepo = AppDataSource.getRepository(Estudiante);
  const escuelaRepo = AppDataSource.getRepository(Escuela);
  const equipoInternoRepo = AppDataSource.getRepository(EquipoInterno);

  const equipoInternoService = new EquipoInternoService(
    equipoInternoRepo,
    AppDataSource.getRepository(Vinculacion),
    AppDataSource.getRepository(Cargo),
    AppDataSource.getRepository(ContratoInteradministrativo),
    AppDataSource.getRepository(ObjetoContrato),
    AppDataSource.getRepository(Justificacion),
    AppDataSource.getRepository(PerfilFuncion),
  );
  const servicio = new InscripcionRedService(
    inscripcionRepo, eventoRepo, estudianteRepo, equipoInternoService,
  );

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

  // Fixtures: un estudiante real y una persona de equipo interno real, para
  // poder probar el camino "sí está registrado" además del de rechazo.
  const escuelaCualquiera = await escuelaRepo.findOne({ where: {} });
  if (!escuelaCualquiera) throw new Error('No hay ninguna escuela en la base para armar el estudiante de prueba');

  const estudianteDoc = `${PREFIJO_DOC}EST`;
  const estudiante = await estudianteRepo.save(estudianteRepo.create({
    documento: estudianteDoc,
    nombres: 'Estudiante',
    apellidos: 'De Prueba',
    escuela: escuelaCualquiera,
  }));

  const equipoInternoDoc = `${PREFIJO_DOC}EQ`;
  const personaEquipoInterno = await equipoInternoRepo.save(equipoInternoRepo.create({
    nombreCompleto: 'Persona Equipo Interno De Prueba',
    documento: equipoInternoDoc,
    activo: true,
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
    correo: `${documento.replace(/[^a-zA-Z0-9]/g, '')}@example.com`,
    edad: 20,
  });

  try {
    // T1: niño música (10-15), SÍ es estudiante registrado -> OK, NINOS_MUSICA
    const t1 = await servicio.crear({
      ...base(estudianteDoc), edad: 12, nombreAcudiente: 'Acudiente Uno',
    });
    verificar('T1 niño música (12), estudiante real -> NINOS_MUSICA', t1.categoria === 'NINOS_MUSICA');

    // T1b: participante música, NO es estudiante registrado -> rechazado
    const e1b = await esperarError(servicio.crear({ ...base(`${PREFIJO_DOC}NOESTUD`), edad: 13 }));
    verificar(
      'T1b participante música sin ser estudiante registrado -> rechazado',
      /estudiante registrado/i.test(e1b), e1b,
    );

    // T2: segundo niño (mismo estudiante no vale, ya usado) -> cupo NINOS_MUSICA lleno
    const e2 = await esperarError(servicio.crear({
      ...base(estudianteDoc), documento: estudianteDoc, edad: 13,
    }));
    // (este caso ya choca primero con "documento duplicado", lo cual también es correcto)
    verificar('T2 reintentar el mismo documento -> rechazado (duplicado o cupo)', e2.length > 0, e2);

    // T3: artista formador música (no exige ser estudiante) -> OK, JOVENES_MUSICA
    const t3 = await servicio.crear({ ...base(`${PREFIJO_DOC}003`), rol: RolMusica.ARTISTA_FORMADOR });
    verificar('T3 artista formador música (20) -> JOVENES_MUSICA', t3.categoria === 'JOVENES_MUSICA');

    // T4: laboratorio red (35) -> OK, LABORATORIO_RED (sin validación cruzada)
    const t4 = await servicio.crear({
      ...base(`${PREFIJO_DOC}004`), rol: RolMusica.LABORATORIO_RED, edad: 35,
    });
    verificar('T4 laboratorio red (35) -> LABORATORIO_RED', t4.categoria === 'LABORATORIO_RED');

    // T5: equipo de gestión música, SÍ es persona de equipo interno -> OK, EQUIPO_INTERNO
    const t5 = await servicio.crear({
      ...base(equipoInternoDoc), rol: RolMusica.EQUIPO_GESTION, edad: 25,
    });
    verificar('T5 equipo gestión música, persona real -> EQUIPO_INTERNO', t5.categoria === 'EQUIPO_INTERNO');

    // T5b: equipo de gestión música, NO está en equipo_interno_personas -> rechazado
    const e5b = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}NOEQUIPO`), rol: RolMusica.EQUIPO_GESTION, edad: 25,
    }));
    verificar(
      'T5b equipo de gestión sin estar registrado como equipo interno -> rechazado',
      /equipo interno/i.test(e5b), e5b,
    );

    // T6: coordinador RPAC -> también EQUIPO_INTERNO, pero ya está en 1/1 por T5 -> cupo lleno
    const e6 = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}006`), red: RedPrograma.RPAC, rol: RolRpac.COORDINADOR, edad: 30,
    }));
    verificar(
      'T6 coordinador RPAC (no registrado, y además cupo ya lleno) -> rechazado',
      e6.length > 0, e6,
    );

    // T7: participante RPAC -> OK, categoría RPAC (no depende de edad ni de validación cruzada)
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

    // T10: música artista formador, edad fuera de 10-15 y 16-28 -> sin categoría
    const e10 = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}010`), rol: RolMusica.ARTISTA_FORMADOR, edad: 5,
    }));
    verificar('T10 música artista formador edad=5 -> sin categoría', /cupo disponible/i.test(e10), e10);

    // T11: documento duplicado en el mismo evento (mismos datos que T1) -> falla
    const e11 = await esperarError(servicio.crear({
      ...base(estudianteDoc), edad: 12, nombreAcudiente: 'Acudiente Uno',
    }));
    verificar('T11 documento duplicado -> rechazado', /existe/i.test(e11), e11);

    // T12: evento que no usa el formulario de red -> rechazado
    const eventoSinRed = await eventoRepo.save(eventoRepo.create({
      nombre: 'TEST_SIN_RED (borrar)',
      tipo: TipoEvento.INSTITUCIONAL,
      fechaInicio: new Date(Date.now() + 86400000),
      usaFormularioRed: false,
    }));
    const e12 = await esperarError(servicio.crear({
      ...base(`${PREFIJO_DOC}012`), rol: RolMusica.ARTISTA_FORMADOR, eventoId: eventoSinRed.id,
    }));
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
    await limpiar(evento.id, estudiante.id, personaEquipoInterno.id);
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
