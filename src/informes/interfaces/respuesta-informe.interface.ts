export interface RespuestaInforme {
  respuesta_id: number;
  profesor_id: number;
  profesor_nombre: string;
  profesor_documento: string;
  escuela: string;
  ciclo: string;
  nivel: string;
  rol: string;
  areas: string | null;
  mes: string;
  pregunta: string;
  respuesta: string | null;
}