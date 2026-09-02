import { TipoAsistente } from '../../asistentes/entities/asistente.entity';

export class VerificarDocumentoResponseDto {
  encontrado: boolean;
  yaInscrito?: boolean;
  asistenteId?: string;
  tipo?: TipoAsistente;
  estudianteId?: string;
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
}