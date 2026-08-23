import { Estudiante } from "../entities/estudiante.entity";
export class CarnetEstudianteDto {
  id: string;
  documento: string;
  nombres: string;
  apellidos: string;
  fotoUrl?: string;
  instrumento?: string;
  escuela: { id: string; nombre: string };

  static fromEntity(estudiante: Estudiante): CarnetEstudianteDto {
    return {
      id: estudiante.id,
      documento: estudiante.documento,
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      fotoUrl: estudiante.fotoUrl,
      instrumento: estudiante.instrumento,
      escuela: { id: estudiante.escuela.id, nombre: estudiante.escuela.nombre },
    };
  }
}