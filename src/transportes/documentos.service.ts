import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PdfPrinter from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  CalculoCiclo, CalculoService, PasajeroCalculado, RutaCalculada,
} from './calculo.service';

// Encabezado de la carta oficial. Pasará a ser configurable cuando exista la
// entidad de empresa transportadora (registro de vehículos, conductores y guías).
const EMPRESA_TRANSPORTE = 'Rutas Verde y Blanco S.A.S.';

const FUENTES = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const GRIS_ENCABEZADO = '#e8eef2';
const VIOLETA_MARCA = '#f0e9fb';

@Injectable()
export class DocumentosService {
  private readonly printer = new PdfPrinter(FUENTES);

  constructor(private readonly calculoService: CalculoService) {}

  async costoPdf(cicloId: string): Promise<Buffer> {
    const calculo = await this.calculoService.calcular(cicloId);
    return this.generarPdf(this.definicionCosto(calculo));
  }

  async rutasPdf(cicloId: string): Promise<Buffer> {
    const calculo = await this.calculoService.calcular(cicloId);
    return this.generarPdf(this.definicionRutas(calculo));
  }

  async libroExcel(cicloId: string): Promise<Buffer> {
    const calculo = await this.calculoService.calcular(cicloId);
    const libro = new ExcelJS.Workbook();
    libro.creator = 'EventPass — Red de Músicas de Medellín';
    libro.created = new Date();

    this.hojaCosto(libro, calculo);
    for (const ruta of calculo.rutas) this.hojaRuta(libro, calculo, ruta);

    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  async nombreArchivo(cicloId: string, extension: string): Promise<string> {
    const calculo = await this.calculoService.calcular(cicloId);
    const fecha = new Date(calculo.fechaEvento).toISOString().slice(0, 10);
    const base = calculo.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-');
    return `${fecha}-${base}.${extension}`;
  }

  // --- PDF: solicitud oficial del servicio ---

  private definicionCosto(c: CalculoCiclo): TDocumentDefinitions {
    const filasRutas = c.rutas.map((ruta) => [
      { text: ruta.nombre, fontSize: 8 },
      { text: ruta.fueraDeRango ? 'CANTIDAD FUERA DE RANGO' : ruta.tipoVehiculo ?? 'NO SE REQUIERE', fontSize: 8 },
      { text: ruta.zona, fontSize: 8, alignment: 'center' as const },
      {
        text: ruta.valor === null
          ? 'N/A'
          : ruta.mediaTarifa
            ? `${this.moneda(ruta.valor)} (solo ida — media tarifa)`
            : this.moneda(ruta.valor),
        fontSize: 8, alignment: 'right' as const,
      },
      { text: String(ruta.puestosNecesarios), fontSize: 8, alignment: 'center' as const },
    ]);

    return {
      pageSize: 'LETTER',
      pageMargins: [40, 40, 40, 40],
      defaultStyle: { font: 'Helvetica', fontSize: 10 },
      content: [
        { text: 'Red de Músicas de Medellín - 2026', bold: true, margin: [0, 0, 0, 16] },
        { text: 'Señores:', bold: true },
        { text: EMPRESA_TRANSPORTE },
        { text: 'Operador de transporte', margin: [0, 0, 0, 12] },
        { text: 'Cordial saludo.', margin: [0, 0, 0, 12] },
        {
          text: 'Por medio de la presente, solicitamos el servicio de transporte descrito a continuación:',
          margin: [0, 0, 0, 14],
        },
        {
          table: {
            widths: [110, '*'],
            body: [
              [{ text: 'FECHA:', bold: true, fontSize: 9 }, { text: this.fechaLarga(c.fechaEvento), fontSize: 9 }],
              [{ text: 'DESTINO:', bold: true, fontSize: 9 }, { text: c.destino, fontSize: 9 }],
              [{ text: 'AGRUPACIÓN:', bold: true, fontSize: 9 }, { text: c.agrupaciones.join(', '), fontSize: 9 }],
              [{ text: 'HORA RECOGIDA:', bold: true, fontSize: 9 }, { text: c.horaRecogida ?? '', fontSize: 9 }],
              [{ text: 'HORA REGRESO:', bold: true, fontSize: 9 }, { text: c.horaRegreso ?? '', fontSize: 9 }],
            ],
          },
          margin: [0, 0, 0, 14],
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 120, 55, 65, 45],
            body: [
              [
                { text: 'RUTA', bold: true, fontSize: 8, alignment: 'center', fillColor: GRIS_ENCABEZADO },
                { text: 'TIPO DE TRANSPORTE', bold: true, fontSize: 8, alignment: 'center', fillColor: GRIS_ENCABEZADO },
                { text: 'ZONA', bold: true, fontSize: 8, alignment: 'center', fillColor: GRIS_ENCABEZADO },
                { text: 'VALOR', bold: true, fontSize: 8, alignment: 'center', fillColor: GRIS_ENCABEZADO },
                { text: 'PUESTOS NECESARIOS', bold: true, fontSize: 8, alignment: 'center', fillColor: GRIS_ENCABEZADO },
              ],
              ...filasRutas,
            ],
          },
          margin: [0, 0, 0, 8],
        },
        {
          columns: [
            { text: 'TOTAL RUTA:', bold: true, alignment: 'right', fontSize: 10 },
            { text: this.moneda(c.totalRutas), bold: true, alignment: 'right', width: 100, fontSize: 10 },
          ],
          margin: [0, 0, 0, 18],
        },
        {
          table: {
            widths: [220, 60],
            body: [
              [{ text: 'Total de participantes reportados', bold: true, fontSize: 9, border: [false, false, false, false] },
               { text: String(c.totalParticipantes), fontSize: 9, border: [false, false, false, false] }],
              [{ text: 'Total puestos ocupados', bold: true, fontSize: 9, border: [false, false, false, false] },
               { text: String(c.totalPuestos), fontSize: 9, border: [false, false, false, false] }],
            ],
          },
          margin: [0, 0, 0, 40],
        },
        { text: '_______________________________', margin: [0, 0, 0, 2] },
        { text: 'Gestor administrativo y operativo', fontSize: 9 },
        ...(c.sinAsignar.length > 0
          ? [{
              text: `Nota interna: ${c.sinAsignar.length} solicitud(es) aprobadas quedaron sin ruta y no están incluidas.`,
              fontSize: 8, italics: true, color: '#b45309', margin: [0, 20, 0, 0],
            } as Content]
          : []),
      ],
    };
  }

  // --- PDF: listado detallado por ruta, una página por ruta ---

  private definicionRutas(c: CalculoCiclo): TDocumentDefinitions {
    const contenido: Content[] = [];

    c.rutas.forEach((ruta, indice) => {
      if (indice > 0) contenido.push({ text: '', pageBreak: 'before' });
      contenido.push(...this.bloqueRuta(c, ruta));
    });

    if (contenido.length === 0) {
      contenido.push({ text: 'No hay solicitudes aprobadas en esta convocatoria.' });
    }

    return {
      pageSize: 'LETTER',
      pageMargins: [30, 30, 30, 30],
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
      content: contenido,
    };
  }

  private bloqueRuta(c: CalculoCiclo, ruta: RutaCalculada): Content[] {
    const etiqueta = (texto: string) => ({ text: texto, bold: true, fontSize: 8 });
    const valor = (texto: string) => ({ text: texto, fontSize: 8 });

    const filas = ruta.pasajeros.map((p) => {
      const relleno = p.marcaDistintiva ? VIOLETA_MARCA : undefined;
      return [
        { text: p.escuela, fontSize: 8, fillColor: relleno },
        { text: this.nombrePasajero(p), fontSize: 8, fillColor: relleno },
        { text: p.instrumento, fontSize: 8, fillColor: relleno },
        // Se marca el trayecto que la persona hace EN ESTA ruta; si el otro lo hace
        // por una ruta distinta, se indica cuál para que la guía lo sepa.
        { text: this.marcaTrayecto(p.ida, p.rutaIda, ruta.codigo), fontSize: 8, alignment: 'center' as const, fillColor: relleno },
        { text: this.marcaTrayecto(p.regreso, p.rutaRegreso, ruta.codigo), fontSize: 8, alignment: 'center' as const, fillColor: relleno },
      ];
    });

    return [
      {
        table: {
          widths: [110, '*', 95, '*'],
          body: [
            [etiqueta('FECHA:'), valor(this.fechaLarga(c.fechaEvento)), etiqueta('# Y PLACA DE VEHÍCULO:'), valor('')],
            [etiqueta('RUTA DEL TRANSPORTE:'), valor(ruta.nombre), etiqueta('CONDUCTOR:'), valor('')],
            [etiqueta('DESTINO:'), valor(c.destino), etiqueta('GUÍA:'), valor('')],
            [etiqueta('AGRUPACIÓN:'), valor(c.agrupaciones.join(', ')), etiqueta(''), valor('')],
            [etiqueta('HORA RECOGIDA:'), valor(c.horaRecogida ?? ''), etiqueta('HORA REGRESO:'), valor(c.horaRegreso ?? '')],
            [
              etiqueta('TIPO DE TRANSPORTE:'),
              valor(ruta.fueraDeRango ? 'CANTIDAD FUERA DE RANGO' : ruta.tipoVehiculo ?? 'NO SE REQUIERE'),
              etiqueta('ZONA:'), valor(ruta.zona),
            ],
            [
              etiqueta('CANTIDAD DE PARTICIPANTES:'), valor(String(ruta.participantes)),
              etiqueta('PUESTOS NECESARIOS:'), valor(String(ruta.puestosNecesarios)),
            ],
            [
              etiqueta('RECORRIDO:'),
              valor(ruta.mediaTarifa ? 'Solo ida — se cobra media tarifa' : 'Ida y regreso'),
              etiqueta(''), valor(''),
            ],
            [
              etiqueta('SUBEN EN LA IDA:'),
              valor(`${ruta.participantesIda} personas — ${ruta.puestosIda} puestos`),
              etiqueta('SUBEN EN EL REGRESO:'),
              valor(`${ruta.participantesRegreso} personas — ${ruta.puestosRegreso} puestos`),
            ],
          ],
        },
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 90, 45, 50],
          body: [
            [
              { text: 'ESCUELA', bold: true, fontSize: 8, fillColor: GRIS_ENCABEZADO },
              { text: 'NOMBRE', bold: true, fontSize: 8, fillColor: GRIS_ENCABEZADO },
              { text: 'INSTRUMENTO', bold: true, fontSize: 8, fillColor: GRIS_ENCABEZADO },
              { text: 'IDA', bold: true, fontSize: 8, alignment: 'center', fillColor: GRIS_ENCABEZADO },
              { text: 'REGRESO', bold: true, fontSize: 8, alignment: 'center', fillColor: GRIS_ENCABEZADO },
            ],
            ...(filas.length > 0
              ? filas
              : [[{ text: 'Sin pasajeros de ida en esta ruta', colSpan: 5, fontSize: 8, italics: true }, {}, {}, {}, {}]]),
          ],
        },
      },
    ];
  }

  // --- Excel ---

  private hojaCosto(libro: ExcelJS.Workbook, c: CalculoCiclo): void {
    const hoja = libro.addWorksheet('1. Costo del servicio');
    hoja.columns = [
      { width: 45 }, { width: 26 }, { width: 12 }, { width: 16 }, { width: 12 },
    ];

    hoja.addRow(['Red de Músicas de Medellín - 2026']).font = { bold: true };
    hoja.addRow([]);
    hoja.addRow(['Señores:', EMPRESA_TRANSPORTE]);
    hoja.addRow(['', 'Operador de transporte']);
    hoja.addRow([]);
    hoja.addRow(['Por medio de la presente, solicitamos el servicio de transporte descrito a continuación:']);
    hoja.addRow([]);

    for (const [etiqueta, valor] of [
      ['FECHA:', this.fechaLarga(c.fechaEvento)],
      ['DESTINO:', c.destino],
      ['AGRUPACIÓN:', c.agrupaciones.join(', ')],
      ['HORA RECOGIDA:', c.horaRecogida ?? ''],
      ['HORA REGRESO:', c.horaRegreso ?? ''],
    ]) {
      const fila = hoja.addRow([etiqueta, valor]);
      fila.getCell(1).font = { bold: true };
    }
    hoja.addRow([]);

    const encabezado = hoja.addRow(['RUTA', 'TIPO DE TRANSPORTE', 'ZONA', 'VALOR', 'PUESTOS NECESARIOS']);
    encabezado.font = { bold: true };
    encabezado.eachCell((celda) => {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF2' } };
      celda.alignment = { horizontal: 'center', wrapText: true };
    });

    for (const ruta of c.rutas) {
      const fila = hoja.addRow([
        ruta.nombre,
        ruta.fueraDeRango ? 'CANTIDAD FUERA DE RANGO' : ruta.tipoVehiculo ?? 'NO SE REQUIERE',
        ruta.zona,
        ruta.valor ?? 'N/A',
        ruta.puestosNecesarios,
      ]);
      if (typeof ruta.valor === 'number') fila.getCell(4).numFmt = '"$"#,##0';
      fila.getCell(5).alignment = { horizontal: 'center' };
    }

    const total = hoja.addRow(['', '', 'TOTAL RUTA:', c.totalRutas, '']);
    total.font = { bold: true };
    total.getCell(4).numFmt = '"$"#,##0';

    hoja.addRow([]);
    hoja.addRow(['Total de participantes reportados', c.totalParticipantes]).getCell(1).font = { bold: true };
    hoja.addRow(['Total puestos ocupados', c.totalPuestos]).getCell(1).font = { bold: true };

    if (c.sinAsignar.length > 0) {
      hoja.addRow([]);
      hoja.addRow([`Nota interna: ${c.sinAsignar.length} solicitud(es) aprobadas quedaron sin ruta`]).font =
        { italic: true, color: { argb: 'FFB45309' } };
      for (const s of c.sinAsignar) hoja.addRow(['', `${s.nombre} (${s.documento}) — ${s.motivo}`]);
    }
  }

  private hojaRuta(libro: ExcelJS.Workbook, c: CalculoCiclo, ruta: RutaCalculada): void {
    // Excel limita los nombres de hoja a 31 caracteres y prohíbe : \ / ? * [ ]
    const nombreHoja = ruta.nombre.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
    const hoja = libro.addWorksheet(nombreHoja);
    hoja.columns = [{ width: 34 }, { width: 34 }, { width: 20 }, { width: 10 }, { width: 10 }];

    const meta: Array<[string, string]> = [
      ['FECHA:', this.fechaLarga(c.fechaEvento)],
      ['RUTA DEL TRANSPORTE:', ruta.nombre],
      ['DESTINO:', c.destino],
      ['AGRUPACIÓN:', c.agrupaciones.join(', ')],
      ['HORA RECOGIDA:', c.horaRecogida ?? ''],
      ['HORA REGRESO:', c.horaRegreso ?? ''],
      ['TIPO DE TRANSPORTE:', ruta.fueraDeRango ? 'CANTIDAD FUERA DE RANGO' : ruta.tipoVehiculo ?? 'NO SE REQUIERE'],
      ['ZONA:', ruta.zona],
      ['CANTIDAD DE PARTICIPANTES:', String(ruta.participantes)],
      ['PUESTOS NECESARIOS:', String(ruta.puestosNecesarios)],
      ['RECORRIDO:', ruta.mediaTarifa ? 'Solo ida — se cobra media tarifa' : 'Ida y regreso'],
      ['SUBEN EN LA IDA:', `${ruta.participantesIda} personas — ${ruta.puestosIda} puestos`],
      ['SUBEN EN EL REGRESO:', `${ruta.participantesRegreso} personas — ${ruta.puestosRegreso} puestos`],
      ['# Y PLACA DE VEHÍCULO:', ''],
      ['CONDUCTOR:', ''],
      ['GUÍA:', ''],
    ];
    for (const [etiqueta, valor] of meta) {
      hoja.addRow([etiqueta, valor]).getCell(1).font = { bold: true };
    }
    hoja.addRow([]);

    const encabezado = hoja.addRow(['ESCUELA', 'NOMBRE', 'INSTRUMENTO', 'IDA', 'REGRESO']);
    encabezado.font = { bold: true };
    encabezado.eachCell((celda) => {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF2' } };
    });

    for (const p of ruta.pasajeros) {
      const fila = hoja.addRow([
        p.escuela,
        this.nombrePasajero(p),
        p.instrumento,
        this.marcaTrayecto(p.ida, p.rutaIda, ruta.codigo),
        this.marcaTrayecto(p.regreso, p.rutaRegreso, ruta.codigo),
      ]);
      if (p.marcaDistintiva) {
        fila.eachCell((celda) => {
          celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0E9FB' } };
        });
      }
    }
  }

  // --- Utilidades ---

  private generarPdf(definicion: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = this.printer.createPdfKitDocument(definicion);
      const trozos: Buffer[] = [];
      doc.on('data', (t: Buffer) => trozos.push(t));
      doc.on('end', () => resolve(Buffer.concat(trozos)));
      doc.on('error', reject);
      doc.end();
    });
  }

  // "SÍ" cuando el trayecto se hace en esta ruta; el código de la otra ruta cuando
  // la persona hace ese trayecto por otro lado; vacío si no lo solicitó.
  private marcaTrayecto(enEstaRuta: boolean, codigoRuta: string | null, codigoActual: string): string {
    if (enEstaRuta) return 'SÍ';
    return codigoRuta && codigoRuta !== codigoActual ? codigoRuta : '';
  }

  // El acompañante no es una fila aparte: viaja con la persona y suma un puesto,
  // así que se anota junto al nombre para que la guía cuadre el conteo.
  private nombrePasajero(p: PasajeroCalculado): string {
    const notas: string[] = [];
    if (p.destinoEspecial) notas.push(`${p.agrupacion} — baja en ${p.destinoEspecial}`);
    if (p.acompanante) notas.push('+1 acompañante');
    return notas.length ? `${p.nombre} (${notas.join('; ')})` : p.nombre;
  }

  private moneda(valor: number): string {
    return `$${valor.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
  }

  private fechaLarga(fecha: Date | string): string {
    return new Date(fecha)
      .toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota',
      })
      .toUpperCase();
  }
}
