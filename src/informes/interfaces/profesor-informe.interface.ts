export interface ProfesorResumen {
  profesorId: number;
  nombre: string;
  escuelas: string[];
  roles: string[];
  totalRespuestas: number;
}

export interface RespuestaProfesor {
  respuestaId: number;
  pregunta: string;
  respuesta: string | null;
  escuela: string;
  rol: string;
  ciclo: string;
  nivel: string;
  areas: string | null;
}

export interface ProfesorDetalle {
  periodoId: number;
  profesorId: number;
  nombre: string;
  totalRespuestas: number;
  respuestas: RespuestaProfesor[];
}