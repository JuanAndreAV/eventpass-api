// Prueba de integración del motor de cálculo: siembra un ciclo con solicitudes
// aprobadas, ejecuta CalculoService contra la base real y verifica los números.
// Uso: npx ts-node -r tsconfig-paths/register scripts/probar-calculo.ts
import { AppDataSource } from '../src/data-source';
import { CalculoService } from '../src/transportes/calculo.service';
import { Ciclo, EstadoCiclo } from '../src/transportes/entities/ciclo.entity';
import { EscuelaRuta } from '../src/transportes/entities/escuela-ruta.entity';
import { Ruta } from '../src/transportes/entities/ruta.entity';
import { Solicitud, EstadoSolicitud } from '../src/transportes/entities/solicitud.entity';
import { Tarifa } from '../src/transportes/entities/tarifa.entity';
import { TipoVehiculo } from '../src/transportes/entities/tipo-vehiculo.entity';
import { Agrupacion } from '../src/transportes/entities/agrupacion.entity';
import { Instrumento } from '../src/transportes/entities/instrumento.entity';
import { Escuela } from '../src/escuelas/entities/escuela.entity';
import { Estudiante } from '../src/estudiantes/entities/estudiante.entity';

const PREFIJO_DOC = 'TESTCALC';

let fallos = 0;
function verificar(nombre: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}${ok ? '' : `  (obtenido: ${JSON.stringify(real)}, esperado: ${JSON.stringify(esperado)})`}`);
}

async function limpiar() {
  await AppDataSource.query(
    `DELETE FROM transporte_solicitudes WHERE estudiante_id IN (SELECT id FROM estudiantes WHERE documento LIKE $1)`,
    [`${PREFIJO_DOC}%`],
  );
  await AppDataSource.query(`DELETE FROM transporte_ciclos WHERE nombre LIKE 'TESTCALC%'`);
  await AppDataSource.query(`DELETE FROM estudiantes WHERE documento LIKE $1`, [`${PREFIJO_DOC}%`]);
}

async function main() {
  await AppDataSource.initialize();
  await limpiar();

  const escuelaRepo = AppDataSource.getRepository(Escuela);
  const estudianteRepo = AppDataSource.getRepository(Estudiante);
  const cicloRepo = AppDataSource.getRepository(Ciclo);
  const solicitudRepo = AppDataSource.getRepository(Solicitud);

  const alfonso = await escuelaRepo.findOneByOrFail({ codigo: 'EMALFONSOLOPEZ' });  // Ruta 1, URBANA
  const miraflores = await escuelaRepo.findOneByOrFail({ codigo: 'EMMIRAFLORES' }); // Ruta 5, RURAL 2
  const santaFe = await escuelaRepo.findOneByOrFail({ codigo: 'EMSANTAFE' });       // Ruta 3, URBANA

  const osi = await AppDataSource.getRepository(Agrupacion).findOneByOrFail({ codigo: 'OSI' });
  const coro = await AppDataSource.getRepository(Agrupacion).findOneByOrFail({ codigo: 'CORO' });
  const contrabajo = await AppDataSource.getRepository(Instrumento).findOneByOrFail({ nombre: 'Contrabajo' });

  const ciclo = await cicloRepo.save(
    cicloRepo.create({
      nombre: 'TESTCALC Ensayo',
      fechaEvento: new Date(Date.now() + 3 * 86400000),
      destino: 'Teatro de prueba',
      fechaCierre: new Date(Date.now() + 2 * 86400000),
      estado: EstadoCiclo.ABIERTO,
      agrupaciones: [osi, coro],
    }),
  );

  // Ruta 1: 4 puestos en la ida y 5 en el regreso. Sin la regla del máximo se
  // contrataría una camioneta (1-4) y dos personas se quedarían sin puesto.
  // Ruta 5: 4 puestos en ambos trayectos, incluido el recargo del contrabajo.
  const personas: Array<{
    doc: string; escuela: Escuela; agrupacion: Agrupacion; instrumento: Instrumento | null;
    ida: Escuela | null; regreso: Escuela | null; acompanante?: boolean;
  }> = [
    { doc: '01', escuela: alfonso, agrupacion: osi, instrumento: null, ida: alfonso, regreso: alfonso },
    { doc: '02', escuela: alfonso, agrupacion: osi, instrumento: null, ida: alfonso, regreso: alfonso },
    { doc: '03', escuela: alfonso, agrupacion: osi, instrumento: null, ida: alfonso, regreso: alfonso },
    // Sale por su escuela pero regresa a otra: debe salir en los dos listados
    { doc: '07', escuela: alfonso, agrupacion: osi, instrumento: null, ida: alfonso, regreso: miraflores },
    // Solo regreso: con el filtro por ida del Excel estas dos desaparecían
    { doc: '08', escuela: alfonso, agrupacion: osi, instrumento: null, ida: null, regreso: alfonso },
    { doc: '09', escuela: alfonso, agrupacion: osi, instrumento: null, ida: null, regreso: alfonso },
    { doc: '04', escuela: miraflores, agrupacion: osi, instrumento: contrabajo, ida: miraflores, regreso: miraflores },
    { doc: '05', escuela: miraflores, agrupacion: osi, instrumento: null, ida: miraflores, regreso: null },
    { doc: '06', escuela: santaFe, agrupacion: coro, instrumento: null, ida: santaFe, regreso: santaFe, acompanante: true },
  ];

  for (const p of personas) {
    const estudiante = await estudianteRepo.save(
      estudianteRepo.create({
        documento: `${PREFIJO_DOC}${p.doc}`,
        nombres: `Prueba${p.doc}`,
        apellidos: 'Calculo',
        escuela: p.escuela,
      }),
    );

    await solicitudRepo.save(
      solicitudRepo.create({
        ciclo, estudiante, escuela: p.escuela, agrupacion: p.agrupacion,
        llevaInstrumento: !!p.instrumento, instrumento: p.instrumento,
        llevaAcompanante: !!p.acompanante,
        requiereIda: !!p.ida, escuelaSalida: p.ida,
        requiereRegreso: !!p.regreso, escuelaLlegada: p.regreso,
        estado: EstadoSolicitud.APROBADA,
      }),
    );
  }

  const servicio = new CalculoService(
    cicloRepo, solicitudRepo,
    AppDataSource.getRepository(EscuelaRuta), AppDataSource.getRepository(Ruta),
    AppDataSource.getRepository(TipoVehiculo), AppDataSource.getRepository(Tarifa),
  );

  const r = await servicio.calcular(ciclo.id);

  console.log('\n=== RESULTADO ===');
  for (const ruta of r.rutas) {
    console.log(
      `  ${ruta.codigo.padEnd(4)} ${ruta.zona.padEnd(8)} personas=${ruta.participantes} ` +
      `ida=${ruta.puestosIda}p regreso=${ruta.puestosRegreso}p -> necesarios=${ruta.puestosNecesarios} ` +
      `${(ruta.tipoVehiculo ?? 'N/A').padEnd(24)} ${ruta.valor?.toLocaleString('es-CO') ?? 'N/A'}`,
    );
  }
  console.log(`  TOTAL: participantes=${r.totalParticipantes} puestos=${r.totalPuestos} valor=$${r.totalRutas.toLocaleString('es-CO')}`);
  if (r.advertencias.length) console.log('  Advertencias:', r.advertencias);
  if (r.sinAsignar.length) console.log('  Sin asignar:', r.sinAsignar);

  console.log('\n=== VERIFICACIONES ===');
  const porCodigo = new Map(r.rutas.map((x) => [x.codigo, x]));
  const r1 = porCodigo.get('R1')!;
  const r5 = porCodigo.get('R5')!;

  verificar('Se calculan 3 rutas', r.rutas.length, 3);

  verificar('R1 puestos de ida = 4', r1.puestosIda, 4);
  verificar('R1 puestos de regreso = 5', r1.puestosRegreso, 5);
  verificar('R1 se dimensiona por el mayor de los dos = 5', r1.puestosNecesarios, 5);
  verificar('R1 vehiculo = MICRO (con solo la ida habria sido CAMIONETA)', r1.tipoVehiculo, 'MICRO - 5 A 15 PUESTOS');
  verificar('R1 tarifa URBANA x MICRO = 450000', r1.valor, 450000);
  verificar('R1 lista a las 6 personas que la usan', r1.participantes, 6);

  const soloRegreso = r1.pasajeros.find((p) => p.documento === `${PREFIJO_DOC}08`)!;
  verificar('El de solo regreso SI aparece en el listado de R1', !!soloRegreso, true);
  verificar('El de solo regreso va marcado solo en regreso', [soloRegreso.ida, soloRegreso.regreso], [false, true]);

  const cruzado07EnR1 = r1.pasajeros.find((p) => p.documento === `${PREFIJO_DOC}07`)!;
  const cruzado07EnR5 = r5.pasajeros.find((p) => p.documento === `${PREFIJO_DOC}07`)!;
  verificar('Quien regresa por otra ruta aparece en el listado de la ida (R1)', [cruzado07EnR1.ida, cruzado07EnR1.regreso], [true, false]);
  verificar('...y tambien en el de la ruta de regreso (R5)', [cruzado07EnR5.ida, cruzado07EnR5.regreso], [false, true]);
  verificar('En R1 se ve por que ruta regresa', cruzado07EnR1.rutaRegreso, 'R5');

  verificar('R5 puestos = 4 (incluye +2 del contrabajo)', r5.puestosNecesarios, 4);
  verificar('R5 vehiculo = CAMIONETA (rango 1-4)', r5.tipoVehiculo, 'CAMIONETA');
  // La camioneta se cobra por hora ($50.000) con un mínimo de 4 horas.
  verificar('R5 tarifa RURAL 2 x CAMIONETA = 200000', r5.valor, 200000);
  verificar('R5 cobra tarifa completa: tiene ida y regreso', r5.mediaTarifa, false);
  verificar('R5 lista a 3 personas', r5.participantes, 3);

  verificar('El Coro Inicial NO cae en la ruta de su escuela (R3)', porCodigo.has('R3'), false);
  verificar('El Coro Inicial cae en su ruta propia R11', porCodigo.get('R11')!.participantes, 1);

  const r11 = porCodigo.get('R11')!;
  verificar('R11 esta marcada como ruta de solo ida', r11.soloIda, true);
  verificar('R11 no registra a nadie en el regreso', r11.participantesRegreso, 0);
  // El acompanante no es una persona mas en el listado, pero si un puesto mas.
  verificar('R11 lista 1 persona pese al acompanante', r11.participantes, 1);
  verificar('R11 puestos = 2 (la persona + su acompanante)', r11.puestosNecesarios, 2);
  verificar('R11 sigue en camioneta: 2 esta en el rango 1-4', r11.tipoVehiculo, 'CAMIONETA');
  verificar('R11 cobra media tarifa por no tener regreso', r11.mediaTarifa, true);
  verificar('R11 conserva la tarifa base de la camioneta', r11.tarifaBase, 200000);
  verificar('R11 cobra la mitad: 200000 / 2', r11.valor, 100000);
  verificar(
    'Se advierte que el regreso pedido por R11 se ignoro',
    r.advertencias.some((a) => a.includes('R11') && a.includes('solo hace ida')),
    true,
  );

  verificar('Total participantes = 9 solicitudes', r.totalParticipantes, 9);
  verificar('Total puestos = 5 + 4 + 2', r.totalPuestos, 11);
  verificar('Total rutas = 450000 + 200000 + 100000', r.totalRutas, 750000);
  verificar('Nadie queda sin asignar', r.sinAsignar.length, 0);

  // --- Escenario 2: volumen real, reproduce la fila 1 del documento oficial ---
  console.log('\n=== ESCENARIO 2: 23 participantes en Ruta 1 (como el PDF del 5 de septiembre) ===');
  await limpiar();

  const ciclo2 = await cicloRepo.save(
    cicloRepo.create({
      nombre: 'TESTCALC Volumen',
      fechaEvento: new Date(Date.now() + 3 * 86400000),
      destino: 'Teatro Universidad de Antioquia',
      fechaCierre: new Date(Date.now() + 2 * 86400000),
      estado: EstadoCiclo.ABIERTO,
      agrupaciones: [osi],
    }),
  );

  for (let i = 1; i <= 23; i++) {
    const estudiante = await estudianteRepo.save(
      estudianteRepo.create({
        documento: `${PREFIJO_DOC}V${String(i).padStart(2, '0')}`,
        nombres: `Vol${i}`, apellidos: 'Calculo', escuela: alfonso,
      }),
    );
    await solicitudRepo.save(
      solicitudRepo.create({
        ciclo: ciclo2, estudiante, escuela: alfonso, agrupacion: osi,
        llevaInstrumento: false, instrumento: null,
        requiereIda: true, escuelaSalida: alfonso,
        requiereRegreso: true, escuelaLlegada: alfonso,
        estado: EstadoSolicitud.APROBADA,
      }),
    );
  }

  const r2 = await servicio.calcular(ciclo2.id);
  const r1v = r2.rutas.find((x) => x.codigo === 'R1')!;
  console.log(
    `  R1 personas=${r1v.participantes} puestos=${r1v.puestosNecesarios} ` +
    `vehiculo=${r1v.tipoVehiculo} valor=${r1v.valor?.toLocaleString('es-CO')}`,
  );

  verificar('Volumen: 23 participantes', r1v.participantes, 23);
  verificar('Volumen: 23 puestos', r1v.puestosNecesarios, 23);
  verificar('Volumen: vehiculo = BUSETA (16-25), como el PDF', r1v.tipoVehiculo, 'BUSETA - 16 A 25 PUESTOS');
  verificar('Volumen: valor = 560000, como el PDF', r1v.valor, 560000);

  await limpiar();
  await AppDataSource.destroy();

  console.log(`\n${fallos === 0 ? 'TODAS LAS VERIFICACIONES PASARON' : `${fallos} VERIFICACIONES FALLARON`}`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  try { await limpiar(); await AppDataSource.destroy(); } catch {}
  process.exit(1);
});
