import { TipoAsistente } from '../../asistentes/entities/asistente.entity';

export class VerificarDocumentoResponseDto {
  encontrado: boolean;
  yaInscrito?: boolean;
  asistenteId?: string;
  tipo?: TipoAsistente;
  qrImagen?: string;
  estudianteId?: string;
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
}