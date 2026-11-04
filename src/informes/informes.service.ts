import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateInformeDto } from './dto/create-informe.dto';
import { UpdateInformeDto } from './dto/update-informe.dto';
import { DjangoService } from 'src/integrations/django/django.service';
import { RespuestaInforme } from './interfaces/respuesta-informe.interface';
import { ResumenInformes } from './interfaces/resumen-informes.interface';
import { PeriodoInforme } from './interfaces/periodo-informe.interface';
import { EvolucionInformes } from './interfaces/evolucion-informes.interface';
import { EscuelaResumen } from './interfaces/escuela-resumen.interface';
import { EscuelaInforme } from './interfaces/escuela-informe.interface';
import { ProfesorDetalle, ProfesorResumen } from './interfaces/profesor-informe.interface';

@Injectable()
export class InformesService {
  constructor(
    private readonly djangoService: DjangoService,
  ) {}

  private readonly cache = new Map<
    number,
    { promesa: Promise<RespuestaInforme[]>; expira: number }
  >();

  private obtenerRespuestas(mesId: number): Promise<RespuestaInforme[]> {
    const hit = this.cache.get(mesId);
    if (hit && hit.expira > Date.now()) return hit.promesa;

    const promesa = this.djangoService.get<RespuestaInforme[]>(
      `Reportes/informes-respuestas/${mesId}/`,
    );

    this.cache.set(mesId, { promesa, expira: Date.now() + 10 * 60_000 });
    promesa.catch(() => this.cache.delete(mesId));

    return promesa;
  }
  async obtenerPeriodos(): Promise<PeriodoInforme[]> {
  const periodos = await this.djangoService.get<PeriodoInforme[]>(
    'Reportes/meses/',
  );

  return periodos.filter((periodo) =>
    periodo.nombre.endsWith(String(periodo.anio)),
  );
}
  async obtenerResumen(mesId: number): Promise<ResumenInformes> {
    if (!Number.isInteger(mesId) || mesId <= 0) {
      throw new BadRequestException('El ID del periodo no es válido');
    }

     const respuestas = await this.obtenerRespuestas(mesId);
    
    const profesores = new Set<number>();
    const escuelas = new Set<string>();

    const roles = new Map<string, number>();
    const areas = new Map<string, number>();
    const ciclos = new Map<string, number>();
    const niveles = new Map<string, number>();

   for (const item of respuestas) {
  profesores.add(item.profesor_id);
  escuelas.add(item.escuela);

  this.incrementar(roles, item.rol);
  this.incrementar(ciclos, item.ciclo);
  this.incrementar(niveles, item.nivel);

  if (item.areas?.trim()) {
    this.incrementar(areas, item.areas.trim());
  }
}

    return {
      periodoId: mesId,
      indicadores: {
        totalRespuestas: respuestas.length,
        profesoresParticipantes: profesores.size,
        escuelasParticipantes: escuelas.size,
      },
      distribucion: {
        roles: this.convertirMapa(roles),
        areas: this.convertirMapa(areas),
        ciclos: this.convertirMapa(ciclos),
        niveles: this.convertirMapa(niveles),
      },
    };
  }

  private incrementar(
    mapa: Map<string, number>,
    clave: string,
  ): void {
    if (!clave) return;

    mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
  }

  private convertirMapa(mapa: Map<string, number>) {
    return Array.from(mapa.entries()).map(([nombre, total]) => ({
      nombre,
      total,
    }));
  }

  async diagnosticarPeriodos(anio: number) {
  const periodos = await this.djangoService.get<PeriodoInforme[]>(
    'Reportes/meses/',
  );

  return periodos
    .filter((periodo) => periodo.anio === anio)
    .sort((a, b) => a.id - b.id);
}
async compararPeriodos(anio: number) {
  const periodos = await this.djangoService.get<PeriodoInforme[]>(
    'Reportes/meses/',
  );

  const periodosAnio = periodos.filter(
    (periodo) => periodo.anio === anio,
  );

  const resultados = await Promise.all(
    periodosAnio.map(async (periodo) => {
      const respuestas = await this.djangoService.get<RespuestaInforme[]>(
        `Reportes/informes-respuestas/${periodo.id}/`,
      );

      return {
        id: periodo.id,
        nombre: periodo.nombre,
        anio: periodo.anio,
        totalRespuestas: respuestas.length,
      };
    }),
  );

  return resultados.sort((a, b) => a.id - b.id);
}
async obtenerEvolucion(anio: number): Promise<EvolucionInformes> {
  if (!Number.isInteger(anio) || anio < 2000) {
    throw new BadRequestException('El año no es válido');
  }

  const periodos = await this.djangoService.get<PeriodoInforme[]>(
    'Reportes/meses/',
  );

  // Utilizamos únicamente los periodos cuyo nombre incluye el año.
  const periodosAnio = periodos
    .filter(
      (periodo) =>
        periodo.anio === anio &&
        periodo.nombre.endsWith(String(anio)),
    )
    .sort((a, b) => a.id - b.id);

  const evolucion = await Promise.all(
    periodosAnio.map(async (periodo) => {
      const respuestas = await this.djangoService.get<RespuestaInforme[]>(
        `Reportes/informes-respuestas/${periodo.id}/`,
      );

      return {
        mesId: periodo.id,
        mes: periodo.nombre.replace(String(anio), ''),
        totalRespuestas: respuestas.length,
      };
    }),
  );

  return {
    anio,
    evolucion,
  };
}
async obtenerResumenEscuelas(
  mesId: number,
): Promise<EscuelaResumen[]> {
  if (!Number.isInteger(mesId) || mesId <= 0) {
    throw new BadRequestException(
      'El ID del periodo no es válido',
    );
  }

  const [escuelas, respuestas] = await Promise.all([
    this.djangoService.get<EscuelaInforme[]>(
      'Reportes/escuelas/',
    ),
    this.obtenerRespuestas(mesId),
  
  ]);

  const respuestasPorEscuela = new Map<
    string,
    RespuestaInforme[]
  >();

  // Agrupar respuestas en una sola pasada
  for (const respuesta of respuestas) {
    const nombreEscuela = respuesta.escuela?.trim();

    if (!nombreEscuela) continue;

    const grupo = respuestasPorEscuela.get(nombreEscuela) ?? [];

    grupo.push(respuesta);

    respuestasPorEscuela.set(nombreEscuela, grupo);
  }

  // Recorrer el catálogo completo de escuelas
  return escuelas.map((escuela) => {
    const respuestasEscuela =
      respuestasPorEscuela.get(escuela.nombre.trim()) ?? [];

    const profesores = new Set(
      respuestasEscuela.map((respuesta) => respuesta.profesor_id),
    );

    const roles = new Map<string, number>();

    for (const respuesta of respuestasEscuela) {
      this.incrementar(roles, respuesta.rol);
    }

    return {
      escuelaId: escuela.id,
      escuela: escuela.nombre,
      direccion: escuela.direccion,
      totalRespuestas: respuestasEscuela.length,
      profesoresParticipantes: profesores.size,
      distribucionRoles: this.convertirMapa(roles),
    };
  });
}
async validarResumenEscuelas(mesId: number) {
  const escuelas = await this.obtenerResumenEscuelas(mesId);

  const totalRespuestas = escuelas.reduce(
    (total, escuela) => total + escuela.totalRespuestas,
    0,
  );

  const totalRoles = escuelas.reduce(
    (total, escuela) =>
      total +
      escuela.distribucionRoles.reduce(
        (subtotal, rol) => subtotal + rol.total,
        0,
      ),
    0,
  );

  return {
    totalEscuelas: escuelas.length,
    escuelasConRespuestas: escuelas.filter(
      (escuela) => escuela.totalRespuestas > 0,
    ).length,
    escuelasSinRespuestas: escuelas.filter(
      (escuela) => escuela.totalRespuestas === 0,
    ).length,
    totalRespuestas,
    totalRoles,
    coincideConResumen: totalRespuestas === 3642,
    coincideRoles: totalRoles === totalRespuestas,
  };
}
async obtenerProfesores(mesId: number): Promise<ProfesorResumen[]> {
  // 1. Validar el ID del periodo
  if (!Number.isInteger(mesId) || mesId <= 0) {
    throw new BadRequestException('El ID del periodo no es válido');
  }

  // 2. Consultar las respuestas del periodo en Django
  const respuestas = await this.obtenerRespuestas(mesId);

  // 3. Estructura temporal para agrupar los profesores
  const profesores = new Map<
    number,
    {
      profesorId: number;
      nombre: string;
      escuelas: Set<string>;
      roles: Set<string>;
      totalRespuestas: number;
    }
  >();

  // 4. Recorrer las respuestas y agrupar por profesor
  for (const item of respuestas) {
    let profesor = profesores.get(item.profesor_id);

    // Si el profesor todavía no existe en el Map, lo creamos
    if (!profesor) {
      profesor = {
        profesorId: item.profesor_id,
        nombre: item.profesor_nombre?.trim() || '',
        escuelas: new Set<string>(),
        roles: new Set<string>(),
        totalRespuestas: 0,
      };

      profesores.set(item.profesor_id, profesor);
    }

    // Si el nombre está vacío, intentamos recuperarlo
    // de alguno de los siguientes registros del mismo profesor
    if (!profesor.nombre && item.profesor_nombre?.trim()) {
      profesor.nombre = item.profesor_nombre.trim();
    }

    // Agregar escuela evitando duplicados
    if (item.escuela?.trim()) {
      profesor.escuelas.add(item.escuela.trim());
    }

    // Agregar rol evitando duplicados
    if (item.rol?.trim()) {
      profesor.roles.add(item.rol.trim());
    }

    // Contabilizar respuestas
    profesor.totalRespuestas++;
  }

  // 5. Convertir el Map en un arreglo para la respuesta HTTP
  return Array.from(profesores.values())
    .map((profesor) => ({
      profesorId: profesor.profesorId,
      nombre: profesor.nombre || `Profesor #${profesor.profesorId}`,
      escuelas: Array.from(profesor.escuelas),
      roles: Array.from(profesor.roles),
      totalRespuestas: profesor.totalRespuestas,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
async obtenerRespuestasProfesor(
  mesId: number,
  profesorId: number,
): Promise<ProfesorDetalle> {
  if (!Number.isInteger(mesId) || mesId <= 0) {
    throw new BadRequestException(
      'El ID del periodo no es válido',
    );
  }

  if (!Number.isInteger(profesorId) || profesorId <= 0) {
    throw new BadRequestException(
      'El ID del profesor no es válido',
    );
  }

  const respuestas = await this.obtenerRespuestas(mesId
  
  );

  const respuestasProfesor = respuestas.filter(
    (item) => item.profesor_id === profesorId,
  );

  if (respuestasProfesor.length === 0) {
    throw new NotFoundException(
      'No se encontraron respuestas para este profesor en el periodo seleccionado',
    );
  }

  const profesor = respuestasProfesor[0];

  return {
    periodoId: mesId,
    profesorId,
    nombre: profesor.profesor_nombre.trim(),
    totalRespuestas: respuestasProfesor.length,
    respuestas: respuestasProfesor.map((item) => ({
      respuestaId: item.respuesta_id,
      pregunta: item.pregunta,
      respuesta: item.respuesta,
      escuela: item.escuela,
      rol: item.rol,
      ciclo: item.ciclo,
      nivel: item.nivel,
      areas: item.areas,
    })),
  };
}
}
