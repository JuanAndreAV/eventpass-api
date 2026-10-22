import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
// Ajusta las rutas a tus entidades
import {Estudiante } from 'src/estudiantes/entities/estudiante.entity';
import { Escuela } from 'src/escuelas/entities/escuela.entity';

const HEADER_ROW = 7; // fila del Excel donde están los nombres de las columnas

const TIPOS_MATRICULA_VALIDOS = ['GENERADA (NUEVOS)', 'RENOVADA', 'ESPECIAL'];

// Valores a la derecha = valores reales de tipo_documento_enum
const TIPO_DOC: Record<string, string> = {
  'CC': 'CC', 'CEDULA DE CIUDADANIA': 'CC',
  'TI': 'TI', 'TARJETA DE IDENTIDAD': 'TI',
  'RC': 'RC', 'RCN': 'RC', 'NUIP': 'RC', 'REGISTRO CIVIL': 'RC',
  'CE': 'CE', 'CEDULA DE EXTRANJERIA': 'CE',
  'PP': 'PASAPORTE', 'PAS': 'PASAPORTE', 'PASAPORTE': 'PASAPORTE',
  'PPT': 'PPT',
};

// clave del Excel (sin "ESCUELA DE MUSICA", normalizada) → codigo en BD
const ALIAS: Record<string, string> = {
  // 'BELEN': 'EMBELEN',
  'SANCRISTOBAL': 'EMSANCRISTOBAL',
};

const LIMITES: Record<string, number> = {
  documento: 20,
  telefono: 20,
  nombres: 100,
  apellidos: 100,
  email: 150,
  instrumento: 100,
  direccion: 255,
};
function limpiarTelefono(v: string | null): string | null {
  if (!v) return null;
  const primero = v.split(/[\/,;]|\s-\s|\sy\s/i)[0];
  const limpio = primero.replace(/[^\d+]/g, '');
  return limpio || null;
}

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');

const clean = (s: unknown) => {
  const v = String(s ?? '').trim();
  return v === '' ? null : v;
};

// Busca la columna por prefijo del encabezado normalizado
const col = (r: Record<string, any>, prefix: string) => {
  const key = Object.keys(r).find(k => k.startsWith(prefix));
  return key ? r[key] : '';
};

function parseFecha(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null;
  }
  const m = String(v).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

const stripEscuela = (s: unknown) => norm(s).replace(/^ESCUELA DE MUSICA\s*/, '');

@Injectable()
export class EstudiantesImportService {
  constructor(
    @InjectRepository(Estudiante) private readonly estudiantesRepo: Repository<Estudiante>,
    @InjectRepository(Escuela) private readonly escuelasRepo: Repository<Escuela>,
  ) {}

  async importar(buffer: Buffer, dryRun: boolean) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    if (!wb.SheetNames.length) throw new BadRequestException('El Excel no tiene hojas');

    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wb.SheetNames[0]], {
      defval: '',
      range: HEADER_ROW - 1, // range es 0-indexado
    });

    const rows = raw.map((r, i) => ({
      fila: i + HEADER_ROW + 1, // coincide con la fila real del Excel
      ...Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k), v])),
    })) as Record<string, any>[];

    // 1) Filtro por tipo de matrícula
    const omitidasPorTipo: Record<string, number> = {};
    const filtradas = rows.filter(r => {
      const tipo = norm(col(r, 'TIPO MATRICULA'));
      if (TIPOS_MATRICULA_VALIDOS.includes(tipo)) return true;
      const k = tipo || '(vacío)';
      omitidasPorTipo[k] = (omitidasPorTipo[k] ?? 0) + 1;
      return false;
    });

    // Más reciente al final → al deduplicar gana la última renovación
    filtradas.sort((a, b) =>
      (parseFecha(col(a, 'FECHA RENOVACION')) ?? '').localeCompare(parseFecha(col(b, 'FECHA RENOVACION')) ?? ''),
    );

    // 2) Escuelas
    const escuelas = await this.escuelasRepo.find({ select: { id: true, nombre: true, codigo: true } });
    const keys = escuelas.map(e => ({ id: e.id, key: stripEscuela(e.nombre) }));

    const matchEscuela = (rawVal: unknown): string | null => {
      const key = stripEscuela(rawVal);
      if (!key) return null;
      if (ALIAS[key]) return escuelas.find(e => e.codigo === ALIAS[key])?.id ?? null;
      const exact = keys.filter(e => e.key === key);
      if (exact.length === 1) return exact[0].id;
      const partial = keys.filter(e => e.key.includes(key) || key.includes(e.key));
      return partial.length === 1 ? partial[0].id : null; // ambiguo o sin match → null
    };

    // 3) Validación y transformación
    const valid = new Map<string, any>();
    const errores: { fila: number; motivo: string }[] = [];

    for (const r of filtradas) {
      const documento = String(col(r, 'NUMERO DE DOCUMENTO')).replace(/\D/g, ''); // rompe pasaportes alfanuméricos
      if (!documento) { errores.push({ fila: r.fila, motivo: 'sin documento' }); continue; }

      const tipoRaw = col(r, 'TIPO DE IDENTIFICACION');
      const tipoDocumento = TIPO_DOC[norm(tipoRaw)];
      if (!tipoDocumento) { errores.push({ fila: r.fila, motivo: `tipo doc desconocido: ${tipoRaw}` }); continue; }

     const enfasisRaw = col(r, 'ENFASIS/LOTE/ESCUELA');
const equipRaw = col(r, 'NOMBRE DEL EQUIPAMIENTO');
const escuelaId = matchEscuela(enfasisRaw) ?? matchEscuela(equipRaw);
if (!escuelaId) {
  errores.push({ fila: r.fila, motivo: `escuela sin match: ${equipRaw} | ${enfasisRaw}` });
  continue;
}

      // Ajusta los nombres de propiedad a los de tu entidad Estudiante
           const est = {
        documento,
        tipoDocumento,
        nombres: [col(r, 'PRIMER NOMBRE'), col(r, 'SEGUNDO NOMBRE')].map(clean).filter(Boolean).join(' '),
        apellidos: [col(r, 'PRIMER APELLIDO'), col(r, 'SEGUNDO APELLIDO')].map(clean).filter(Boolean).join(' '),
        email: clean(col(r, 'CORREO ELECTRONICO'))?.toLowerCase() ?? null,
        telefono: limpiarTelefono(clean(col(r, 'CELULAR')) ?? clean(col(r, 'TELEFONO FIJO'))),
        instrumento: clean(col(r, 'INSTRUMENTO')),
        fechaNacimiento: parseFecha(col(r, 'FECHA NACIMIENTO')),
        direccion: clean(col(r, 'DIRECCION')),
        escuela: { id: escuelaId },
      };

      const excedido = Object.entries(LIMITES).find(
        ([k, max]) => String((est as any)[k] ?? '').length > max,
      );
      if (excedido) {
        errores.push({ fila: r.fila, motivo: `${excedido[0]} excede ${excedido[1]} caracteres` });
        continue;
      }

      valid.set(documento, est);}

    const batch = [...valid.values()];

    const erroresAgrupados: Record<string, number> = {};
    errores.forEach(e => (erroresAgrupados[e.motivo] = (erroresAgrupados[e.motivo] ?? 0) + 1));

    const reporte = {
      dryRun,
      hojas: wb.SheetNames,
      columnasDetectadas: Object.keys(rows[0] ?? {}).filter(k => k !== 'fila'),
      filasExcel: rows.length,
      conMatriculaValida: filtradas.length,
      omitidasPorTipo,
      validasUnicas: batch.length,
      errores: errores.length,
      erroresAgrupados,
      muestraErrores: errores.slice(0, 20),
      upserted: 0,
    };

    if (dryRun) return reporte;

    // 4) Upsert por lotes (no toca nfcUid, qrTokenMaster, fotoUrl, usuario_id)
    for (let i = 0; i < batch.length; i += 500) {
      await this.estudiantesRepo.upsert(batch.slice(i, i + 500) as any, ['documento']);
      reporte.upserted += Math.min(500, batch.length - i);
    }
    return reporte;
  }
}