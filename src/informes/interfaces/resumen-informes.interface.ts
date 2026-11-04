export interface IndicadoresInformes {
  totalRespuestas: number;
  profesoresParticipantes: number;
  escuelasParticipantes: number;
}

export interface DistribucionInforme {
  nombre: string;
  total: number;
}

export interface DistribucionInformes {
  roles: DistribucionInforme[];
  areas: DistribucionInforme[];
  ciclos: DistribucionInforme[];
  niveles: DistribucionInforme[];
}

export interface ResumenInformes {
  periodoId: number;
  indicadores: IndicadoresInformes;
  distribucion: DistribucionInformes;
}