// Genera los tres documentos de una convocatoria de prueba y verifica su contenido.
// Uso: npx ts-node -r tsconfig-paths/register scripts/probar-documentos.ts <carpetaSalida>
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { AppDataSource } from '../src/data-source';
import { CalculoService } from '../src/transportes/calculo.service';
import { DocumentosService } from '../src/transportes/documentos.service';
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

const PREFIJO_DOC = 'TESTDOC';
const salida = process.argv[2] || '.';

let fallos = 0;
function verificar(nombre: string, ok: boolean, detalle = '') {
  if (!ok) fallos++;
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${nombre}${ok || !detalle ? '' : `  (${detalle})`}`);
}

async function limpiar() {
  await AppDataSource.query(
    `DELETE FROM transporte_solicitudes WHERE estudiante_id IN (SELECT id FROM estudiantes WHERE documento LIKE $1)`,
    [`${PREFIJO_DOC}%`],
  );
  await AppDataSource.query(`DELETE FROM transporte_ciclos WHERE nombre LIKE 'TESTDOC%'`);
  await AppDataSource.query(`DELETE FROM estudiantes WHERE documento LIKE $1`, [`${PREFIJO_DOC}%`]);
}

async function main() {
  await AppDataSource.initialize();
  await limpiar();

  const escuelaRepo = AppDataSource.getRepository(Escuela);
  const estudianteRepo = AppDataSource.getRepository(Estudiante);
  const cicloRepo = AppDataSource.getRepository(Ciclo);
  const solicitudRepo = AppDataSource.getRepository(Solicitud);

  const alfonso = await escuelaRepo.findOneByOrFail({ codigo: 'EMALFONSOLOPEZ' }); // R1 URBANA
  const miraflores = await escuelaRepo.findOneByOrFail({ codigo: 'EMMIRAFLORES' }); // R5 RURAL 2
  const osi = await AppDataSource.getRepository(Agrupacion).findOneByOrFail({ codigo: 'OSI' });
  const neuro = await AppDataSource.getRepository(Agrupacion).findOneByOrFail({ codigo: 'NEURO' });
  const contrabajo = await AppDataSource.getRepository(Instrumento).findOneByOrFail({ nombre: 'Contrabajo' });

  const ciclo = await cicloRepo.save(
    cicloRepo.create({
      nombre: 'TESTDOC Concierto de prueba',
      fechaEvento: new Date('2026-09-12T09:00:00-05:00'),
      destino: 'TEATRO UNIVERSIDAD DE ANTIOQUIA',
      fechaCierre: new Date('2026-09-09T10:00:00-05:00'),
      estado: EstadoCiclo.ABIERTO,
      horaRecogida: '7:30 A.M. RURAL Y 8:00 A.M. URBANA',
      horaRegreso: '1:00 P.M. DESDE LA U DE A',
      agrupaciones: [osi, neuro],
    }),
  );

  const personas = [
    { doc: '01', nombres: 'Ana Sofía', escuela: alfonso, agrupacion: osi, instrumento: contrabajo, ida: alfonso, regreso: alfonso },
    { doc: '02', nombres: 'Juan Esteban', escuela: alfonso, agrupacion: osi, instrumento: null, ida: alfonso, regreso: alfonso },
    { doc: '03', nombres: 'María Camila', escuela: alfonso, agrupacion: neuro, instrumento: null, ida: alfonso, regreso: alfonso },
    // Solo regreso: antes desaparecía de las planillas
    { doc: '06', nombres: 'Santiago', escuela: alfonso, agrupacion: osi, instrumento: null, ida: null, regreso: alfonso },
    // Sale por su escuela y regresa por otra ruta: debe salir en ambas planillas
    { doc: '07', nombres: 'Isabella', escuela: alfonso, agrupacion: osi, instrumento: null, ida: alfonso, regreso: miraflores },
    { doc: '04', nombres: 'Luis Ángel', escuela: miraflores, agrupacion: osi, instrumento: null, ida: miraflores, regreso: miraflores },
    // Solo ida
    { doc: '05', nombres: 'Valentina', escuela: miraflores, agrupacion: osi, instrumento: null, ida: miraflores, regreso: null },
  ];

  for (const p of personas) {
    const estudiante = await estudianteRepo.save(
      estudianteRepo.create({
        documento: `${PREFIJO_DOC}${p.doc}`,
        nombres: p.nombres,
        apellidos: 'Pérez Gómez',
        escuela: p.escuela,
      }),
    );
    await solicitudRepo.save(
      solicitudRepo.create({
        ciclo, estudiante, escuela: p.escuela, agrupacion: p.agrupacion,
        llevaInstrumento: !!p.instrumento, instrumento: p.instrumento,
        requiereIda: !!p.ida, escuelaSalida: p.ida,
        requiereRegreso: !!p.regreso, escuelaLlegada: p.regreso,
        estado: EstadoSolicitud.APROBADA,
      }),
    );
  }

  const calculo = new CalculoService(
    cicloRepo, solicitudRepo,
    AppDataSource.getRepository(EscuelaRuta), AppDataSource.getRepository(Ruta),
    AppDataSource.getRepository(TipoVehiculo), AppDataSource.getRepository(Tarifa),
  );
  const documentos = new DocumentosService(calculo);

  const costoPdf = await documentos.costoPdf(ciclo.id);
  const rutasPdf = await documentos.rutasPdf(ciclo.id);
  const libro = await documentos.libroExcel(ciclo.id);

  fs.mkdirSync(salida, { recursive: true });
  const rutaCosto = path.join(salida, 'costo-del-servicio.pdf');
  const rutaRutas = path.join(salida, 'listados-por-ruta.pdf');
  const rutaLibro = path.join(salida, 'transporte.xlsx');
  fs.writeFileSync(rutaCosto, costoPdf);
  fs.writeFileSync(rutaRutas, rutasPdf);
  fs.writeFileSync(rutaLibro, libro);

  console.log('\n=== ARCHIVOS GENERADOS ===');
  console.log(`  ${rutaCosto} (${costoPdf.length} bytes)`);
  console.log(`  ${rutaRutas} (${rutasPdf.length} bytes)`);
  console.log(`  ${rutaLibro} (${libro.length} bytes)`);

  console.log('\n=== VERIFICACIONES ===');
  verificar('costo.pdf es un PDF valido', costoPdf.subarray(0, 5).toString() === '%PDF-');
  verificar('costo.pdf tiene contenido real (>2KB)', costoPdf.length > 2000, `${costoPdf.length} bytes`);
  verificar('rutas.pdf es un PDF valido', rutasPdf.subarray(0, 5).toString() === '%PDF-');
  verificar('rutas.pdf pesa mas que el de costo (lleva los listados)', rutasPdf.length > 2000);
  verificar('xlsx es un archivo ZIP/OOXML valido', libro.subarray(0, 2).toString() === 'PK');

  // El Excel se vuelve a abrir y se comprueban celdas concretas
  const libroLeido = new ExcelJS.Workbook();
  await libroLeido.xlsx.load(libro as unknown as ArrayBuffer);
  const nombresHoja = libroLeido.worksheets.map((h) => h.name);
  console.log(`  hojas: ${nombresHoja.join(' | ')}`);

  verificar('El libro trae la hoja de costo', nombresHoja[0] === '1. Costo del servicio');
  verificar('El libro trae una hoja por ruta (R1 y R5)', nombresHoja.length === 3, nombresHoja.join(', '));

  const hojaCosto = libroLeido.getWorksheet('1. Costo del servicio')!;
  const textoCosto = JSON.stringify(hojaCosto.getSheetValues());
  verificar('La hoja de costo nombra la empresa transportadora', textoCosto.includes('Rutas Verde y Blanco'));
  verificar('La hoja de costo trae el destino', textoCosto.includes('TEATRO UNIVERSIDAD DE ANTIOQUIA'));
  verificar('La hoja de costo trae la hora de recogida del ciclo', textoCosto.includes('7:30 A.M. RURAL'));
  verificar('La hoja de costo muestra el tipo de vehiculo calculado', textoCosto.includes('MICRO - 5 A 15 PUESTOS'));
  verificar('La hoja de costo incluye TOTAL RUTA', textoCosto.includes('TOTAL RUTA:'));

  const hojaR1 = libroLeido.worksheets[1];
  const textoR1 = JSON.stringify(hojaR1.getSheetValues());
  verificar('La hoja de ruta trae el encabezado de pasajeros', textoR1.includes('INSTRUMENTO'));
  verificar('La hoja de ruta lista al del contrabajo', textoR1.includes('Contrabajo'));
  verificar('La hoja de ruta marca al Ensamble Neuro con su destino',
    textoR1.includes('Ensamble Neuro') && textoR1.includes('Belén Parque Biblioteca'));
  verificar('La hoja de ruta deja los campos de vehiculo para la transportadora',
    textoR1.includes('CONDUCTOR:') && textoR1.includes('GUÍA:'));
  verificar('La hoja de ruta desglosa ida y regreso',
    textoR1.includes('SUBEN EN LA IDA:') && textoR1.includes('SUBEN EN EL REGRESO:'));
  verificar('Quien pidio solo regreso SI aparece en la planilla de R1', textoR1.includes('Santiago'));
  verificar('Quien regresa por otra ruta aparece en R1 con la referencia a R5',
    textoR1.includes('Isabella') && textoR1.includes('R5'));

  const hojaR5 = libroLeido.worksheets[2];
  const textoR5 = JSON.stringify(hojaR5.getSheetValues());
  verificar('...y tambien en la planilla de R5', textoR5.includes('Isabella'));

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
