export interface EscuelaResumen {
  escuelaId: number;
  escuela: string;
  direccion: string;
  totalRespuestas: number;
  profesoresParticipantes: number;
  distribucionRoles: {
    nombre: string;
    total: number;
  }[];
}