export interface MesEvolucion {
  mesId: number;
  mes: string;
  totalRespuestas: number;
}

export interface EvolucionInformes {
  anio: number;
  evolucion: MesEvolucion[];
}