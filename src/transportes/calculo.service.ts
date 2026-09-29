import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ciclo } from './entities/ciclo.entity';
import { EscuelaRuta } from './entities/escuela-ruta.entity';
import { Ruta } from './entities/ruta.entity';
import { EstadoSolicitud, Solicitud } from './entities/solicitud.entity';
import { Tarifa } from './entities/tarifa.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';

export interface PasajeroCalculado {
  solicitudId: string;
  documento: string;
  nombre: string;
  escuela: string;
  instrumento: string;
  puestosAdicionales: number;
  agrupacion: string;
  // Un puesto más para quien viaja acompañado (Ensamble Neuro).
  acompanante: boolean;
  marcaDistintiva: boolean;
  destinoEspecial: string | null;
  // Respecto de ESTA ruta: puede ir en la ida por aquí y regresar por otra.
  ida: boolean;
  regreso: boolean;
  rutaIda: string | null;
  rutaRegreso: string | null;
}

export interface RutaCalculada {
  rutaId: string;
  codigo: string;
  nombre: string;
  zona: string;
  participantes: number;
  participantesIda: number;
  participantesRegreso: number;
  puestosIda: number;
  puestosRegreso: number;
  puestosNecesarios: number;
  tipoVehiculo: string | null;
  fueraDeRango: boolean;
  // La ruta está marcada como de un solo recorrido en el catálogo.
  soloIda: boolean;
  // Nadie pidió regreso, así que el vehículo hace un solo trayecto y cobra la mitad.
  mediaTarifa: boolean;
  tarifaBase: number | null;
  valor: number | null;
  pasajeros: PasajeroCalculado[];
}

export interface CalculoCiclo {
  cicloId: string;
  nombre: string;
  fechaEvento: Date;
  destino: string;
  horaRecogida: string | null;
  horaRegreso: string | null;
  agrupaciones: string[];
  rutas: RutaCalculada[];
  totalParticipantes: number;
  totalPuestos: number;
  totalRutas: number;
  sinAsignar: Array<{ documento: string; nombre: string; motivo: string }>;
  advertencias: string[];
}

@Injectable()
export class CalculoService {
  constructor(
    @InjectRepository(Ciclo) private readonly cicloRepo: Repository<Ciclo>,
    @InjectRepository(Solicitud) private readonly solicitudRepo: Repository<Solicitud>,
    @InjectRepository(EscuelaRuta) private readonly mapeoRepo: Repository<EscuelaRuta>,
    @InjectRepository(Ruta) private readonly rutaRepo: Repository<Ruta>,
    @InjectRepository(TipoVehiculo) private readonly tipoVehiculoRepo: Repository<TipoVehiculo>,
    @InjectRepository(Tarifa) private readonly tarifaRepo: Repository<Tarifa>,
  ) {}

  async calcular(cicloId: string): Promise<CalculoCiclo> {
    const ciclo = await this.cicloRepo.findOne({
      where: { id: cicloId },
      relations: { agrupaciones: true },
    });
    if (!ciclo) throw new NotFoundException(`El ciclo con ID ${cicloId} no existe`);

    const solicitudes = await this.solicitudRepo.find({
      where: { ciclo: { id: cicloId }, estado: EstadoSolicitud.APROBADA },
      relations: {
        estudiante: true, escuela: true, agrupacion: { ruta: true },
        instrumento: true, escuelaSalida: true, escuelaLlegada: true,
      },
    });

    const rutaPorEscuela = await this.mapaEscuelaRuta();
    const rutas = await this.rutaRepo.find({ relations: { zona: true } });
    const tiposVehiculo = await this.tipoVehiculoRepo.find({ order: { puestosMin: 'ASC' } });
    const tarifas = await this.tarifaRepo.find({ relations: { zona: true, tipoVehiculo: true } });

    const sinAsignar: CalculoCiclo['sinAsignar'] = [];
    const advertencias: string[] = [];

    // Una persona entra al listado de cada ruta que usa. Si va y vuelve por la
    // misma, entra una sola vez con ambos trayectos marcados.
    const pasajerosPorRuta = new Map<string, Map<string, PasajeroCalculado>>();

    const registrar = (rutaId: string, pasajero: PasajeroCalculado, trayecto: 'ida' | 'regreso') => {
      const listado = pasajerosPorRuta.get(rutaId) ?? new Map<string, PasajeroCalculado>();
      const existente = listado.get(pasajero.solicitudId);
      if (existente) {
        existente[trayecto] = true;
      } else {
        listado.set(pasajero.solicitudId, { ...pasajero, [trayecto]: true });
      }
      pasajerosPorRuta.set(rutaId, listado);
    };

    for (const solicitud of solicitudes) {
      const nombre = `${solicitud.estudiante.nombres} ${solicitud.estudiante.apellidos}`.trim();
      const rutaFija = solicitud.agrupacion.ruta ?? null;

      const rutaIda = solicitud.requiereIda
        ? rutaFija ?? (solicitud.escuelaSalida ? rutaPorEscuela.get(solicitud.escuelaSalida.id) ?? null : null)
        : null;
      const rutaRegreso = solicitud.requiereRegreso
        ? rutaFija ?? (solicitud.escuelaLlegada ? rutaPorEscuela.get(solicitud.escuelaLlegada.id) ?? null : null)
        : null;

      if (solicitud.requiereIda && !rutaIda) {
        sinAsignar.push({
          documento: solicitud.estudiante.documento,
          nombre,
          motivo: `Ida: la escuela "${solicitud.escuelaSalida?.nombre ?? 'no indicada'}" no está asignada a ninguna ruta`,
        });
      }
      if (solicitud.requiereRegreso && !rutaRegreso) {
        sinAsignar.push({
          documento: solicitud.estudiante.documento,
          nombre,
          motivo: `Regreso: la escuela "${solicitud.escuelaLlegada?.nombre ?? 'no indicada'}" no está asignada a ninguna ruta`,
        });
      }

      const base: PasajeroCalculado = {
        solicitudId: solicitud.id,
        documento: solicitud.estudiante.documento,
        nombre,
        escuela: solicitud.escuela.nombre,
        instrumento: solicitud.llevaInstrumento ? solicitud.instrumento?.nombre ?? 'No aplica' : 'No aplica',
        puestosAdicionales: solicitud.llevaInstrumento ? solicitud.instrumento?.puestosAdicionales ?? 0 : 0,
        agrupacion: solicitud.agrupacion.nombre,
        acompanante: solicitud.llevaAcompanante,
        marcaDistintiva: solicitud.agrupacion.requiereMarcaDistintiva,
        destinoEspecial: solicitud.agrupacion.destinoEspecial ?? null,
        ida: false,
        regreso: false,
        rutaIda: rutaIda?.codigo ?? null,
        rutaRegreso: rutaRegreso?.codigo ?? null,
      };

      if (rutaIda) registrar(rutaIda.id, base, 'ida');

      if (rutaRegreso?.soloIda) {
        // No debería llegar aquí: la solicitud lo valida al crearse. Si una ruta se
        // marca como solo ida después, se avisa en vez de inventar un regreso.
        advertencias.push(
          `${rutaRegreso.codigo}: ${nombre} pidió regreso por una ruta que solo hace ida; se ignoró ese trayecto`,
        );
      } else if (rutaRegreso) {
        registrar(rutaRegreso.id, base, 'regreso');
      }
    }

    const rutasCalculadas: RutaCalculada[] = [];

    for (const ruta of this.ordenarPorCodigo(rutas)) {
      const listado = pasajerosPorRuta.get(ruta.id);
      if (!listado || listado.size === 0) continue;

      const pasajeros = [...listado.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const deIda = pasajeros.filter((p) => p.ida);
      const deRegreso = pasajeros.filter((p) => p.regreso);

      const puestos = (grupo: PasajeroCalculado[]) =>
        grupo.reduce((suma, p) => suma + 1 + p.puestosAdicionales + (p.acompanante ? 1 : 0), 0);

      const puestosIda = puestos(deIda);
      const puestosRegreso = puestos(deRegreso);
      // El mismo vehículo hace los dos recorridos: debe alcanzar para el más cargado.
      const puestosNecesarios = Math.max(puestosIda, puestosRegreso);

      const tipoVehiculo = tiposVehiculo.find(
        (t) => puestosNecesarios >= t.puestosMin && puestosNecesarios <= t.puestosMax,
      );
      const tarifa = tipoVehiculo
        ? this.tarifaVigente(tarifas, ruta.zona.id, tipoVehiculo.id, ciclo.fechaEvento)
        : null;

      if (puestosNecesarios > 0 && !tipoVehiculo) {
        advertencias.push(
          `${ruta.codigo}: ${puestosNecesarios} puestos queda fuera de los rangos de vehículo configurados`,
        );
      }
      if (tipoVehiculo && !tarifa) {
        advertencias.push(
          `${ruta.codigo}: no hay tarifa vigente para ${ruta.zona.nombre} con ${tipoVehiculo.nombre}`,
        );
      }

      // Si nadie pide regreso, el vehículo hace un solo recorrido y cuesta la mitad.
      const mediaTarifa = deRegreso.length === 0;
      const tarifaBase = tarifa ? Number(tarifa.valor) : null;
      const valor = tarifaBase === null ? null : mediaTarifa ? tarifaBase / 2 : tarifaBase;

      rutasCalculadas.push({
        rutaId: ruta.id,
        codigo: ruta.codigo,
        nombre: ruta.nombre,
        zona: ruta.zona.nombre,
        participantes: pasajeros.length,
        participantesIda: deIda.length,
        participantesRegreso: deRegreso.length,
        puestosIda,
        puestosRegreso,
        puestosNecesarios,
        tipoVehiculo: tipoVehiculo?.nombre ?? null,
        fueraDeRango: puestosNecesarios > 0 && !tipoVehiculo,
        soloIda: ruta.soloIda,
        mediaTarifa,
        tarifaBase,
        valor,
        pasajeros,
      });
    }

    return {
      cicloId: ciclo.id,
      nombre: ciclo.nombre,
      fechaEvento: ciclo.fechaEvento,
      destino: ciclo.destino,
      horaRecogida: ciclo.horaRecogida ?? null,
      horaRegreso: ciclo.horaRegreso ?? null,
      agrupaciones: ciclo.agrupaciones.map((a) => a.nombre),
      rutas: rutasCalculadas,
      // Una persona que va y vuelve por rutas distintas aparece en dos listados,
      // así que el total de participantes cuenta solicitudes, no filas.
      totalParticipantes: solicitudes.length,
      totalPuestos: rutasCalculadas.reduce((s, r) => s + r.puestosNecesarios, 0),
      // Como en el Excel: el total suma solo las rutas; los traslados adicionales van aparte.
      totalRutas: rutasCalculadas.reduce((s, r) => s + (r.valor ?? 0), 0),
      sinAsignar,
      advertencias,
    };
  }

  private async mapaEscuelaRuta(): Promise<Map<string, Ruta>> {
    const mapeos = await this.mapeoRepo.find({ relations: { escuela: true, ruta: { zona: true } } });
    return new Map(mapeos.map((m) => [m.escuela.id, m.ruta]));
  }

  private tarifaVigente(
    tarifas: Tarifa[],
    zonaId: string,
    tipoVehiculoId: string,
    fechaEvento: Date,
  ): Tarifa | null {
    const candidatas = tarifas
      .filter(
        (t) =>
          t.activa &&
          t.zona.id === zonaId &&
          t.tipoVehiculo.id === tipoVehiculoId &&
          new Date(t.vigenteDesde) <= fechaEvento,
      )
      .sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? 1 : -1));

    return candidatas[0] ?? null;
  }

  private ordenarPorCodigo(rutas: Ruta[]): Ruta[] {
    const numero = (codigo: string) => Number(codigo.replace(/\D/g, '')) || 0;
    return [...rutas].sort((a, b) => numero(a.codigo) - numero(b.codigo));
  }
}
