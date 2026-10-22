// 1792700000000-SeedEquipoInternoDatosReales.ts
//
// Siembra los datos reales del equipo interno de la REMM que llegaron en una
// segunda entrega del JSON (la primera, migrada en CreateEquipoInterno, se
// cortó antes de los arrays "personas" y "vinculaciones", y antes de
// completar "perfiles_funciones"): 199 personas, 199 vinculaciones y los
// perfiles de función FUN-005 a FUN-046 (FUN-001..FUN-004 ya existían).
//
// 5 personas (PER-0195..PER-0199) llegaron sin número de documento ("nuevo"
// en el Excel) y sin contrato interadministrativo todavía (estado
// PENDIENTE_CONTRATACION): se crea la persona pero NO su vinculación, porque
// equipo_vinculaciones.contrato_interadministrativo_id es NOT NULL y no hay
// contrato real que referenciar aún — inventar uno violaría la convención
// del JSON de origen ("null = dato ausente; no inventar valores").
import * as fs from 'fs';
import * as path from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

interface PerfilFuncionData {
  id: string;
  cargo_referencia: string;
  items: string[];
}

interface PersonaData {
  ref: string;
  nombre_completo: string;
  numero_documento: string | null;
  telefonos: string[];
  email_principal: string | null;
  estado_datos: 'COMPLETO' | 'PENDIENTE';
}

interface VinculacionData {
  persona_ref: string;
  grupo: string;
  tipo_vinculacion: string;
  contrato_interadministrativo_id: string | null;
  cargo_id: string;
  objeto_contrato_id: string | null;
  justificacion_id: string | null;
  funciones_id: string | null;
  valor_mensual: number | null;
  forma_pago: string | null;
  dedicacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
}

interface DatosEquipoInterno {
  perfilesFuncionRestantes: PerfilFuncionData[];
  personas: PersonaData[];
  vinculaciones: VinculacionData[];
}

// El JSON de origen usa "30_HORAS" (no es un identificador TS válido); el
// enum Dedicacion lo modela como TREINTA_HORAS.
const DEDICACION_JSON_A_ENUM: Record<string, string> = {
  TIEMPO_COMPLETO: 'TIEMPO_COMPLETO',
  MEDIO_TIEMPO: 'MEDIO_TIEMPO',
  TREINTA_HORAS: 'TREINTA_HORAS',
  '30_HORAS': 'TREINTA_HORAS',
};

export class SeedEquipoInternoDatosReales1792700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const datos: DatosEquipoInterno = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'equipo-interno-datos.json'), 'utf-8'),
    );

    await this.seedPerfilesFuncionRestantes(queryRunner, datos.perfilesFuncionRestantes);

    const personaIdPorRef = await this.seedPersonas(queryRunner, datos.personas);

    const cargoIdPorCodigo = await this.cargarMapaCodigos(queryRunner, 'equipo_cargos');
    const contratoIdPorCodigo = await this.cargarMapaCodigos(queryRunner, 'equipo_contratos_interadministrativos');
    const objetoIdPorCodigo = await this.cargarMapaCodigos(queryRunner, 'equipo_objetos_contrato');
    const justificacionIdPorCodigo = await this.cargarMapaCodigos(queryRunner, 'equipo_justificaciones');
    const perfilIdPorCodigo = await this.cargarMapaCodigos(queryRunner, 'equipo_perfiles_funciones');

    let omitidas = 0;
    for (const v of datos.vinculaciones) {
      if (!v.contrato_interadministrativo_id) {
        // PENDIENTE_CONTRATACION sin contrato real todavía: no se inserta
        // vinculación (ver nota de cabecera). La persona ya quedó creada.
        omitidas++;
        continue;
      }
      const personaId = personaIdPorRef.get(v.persona_ref);
      if (!personaId) throw new Error(`persona_ref ${v.persona_ref} no encontrado`);

      await queryRunner.query(
        `INSERT INTO "equipo_vinculaciones"
          ("persona_id","cargo_id","contrato_interadministrativo_id","objeto_contrato_id",
           "justificacion_id","perfil_funcion_id","grupo","tipo_vinculacion","dedicacion",
           "forma_pago","fecha_inicio","fecha_fin","monto","estado_vinculacion")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          personaId,
          cargoIdPorCodigo.get(v.cargo_id),
          contratoIdPorCodigo.get(v.contrato_interadministrativo_id),
          v.objeto_contrato_id ? objetoIdPorCodigo.get(v.objeto_contrato_id) : null,
          v.justificacion_id ? justificacionIdPorCodigo.get(v.justificacion_id) : null,
          v.funciones_id ? perfilIdPorCodigo.get(v.funciones_id) : null,
          v.grupo,
          v.tipo_vinculacion,
          v.dedicacion ? DEDICACION_JSON_A_ENUM[v.dedicacion] : null,
          v.forma_pago,
          v.fecha_inicio,
          v.fecha_fin,
          v.valor_mensual,
          v.estado,
        ],
      );
    }

    // eslint-disable-next-line no-console
    console.log(
      `SeedEquipoInternoDatosReales: ${datos.personas.length} personas, ` +
        `${datos.vinculaciones.length - omitidas} vinculaciones insertadas, ` +
        `${omitidas} omitidas por falta de contrato (PENDIENTE_CONTRATACION).`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se puede distinguir de forma segura "datos reales" de datos creados
    // a mano después de correr esta migración, así que el down no borra
    // filas — revertir el módulo completo ya lo hace CreateEquipoInterno.down.
    await queryRunner.query(`SELECT 1`);
  }

  private async seedPerfilesFuncionRestantes(qr: QueryRunner, perfiles: PerfilFuncionData[]): Promise<void> {
    for (const p of perfiles) {
      await qr.query(
        `INSERT INTO "equipo_perfiles_funciones" ("codigo_importacion","cargo_referencia","items")
         VALUES ($1,$2,$3)`,
        [p.id, p.cargo_referencia, JSON.stringify(p.items)],
      );
    }
  }

  private async seedPersonas(qr: QueryRunner, personas: PersonaData[]): Promise<Map<string, string>> {
    const idPorRef = new Map<string, string>();
    for (const p of personas) {
      const telefono = p.telefonos.length > 0 ? p.telefonos[0] : null;
      const rows: Array<{ id: string }> = await qr.query(
        `INSERT INTO "equipo_interno_personas"
          ("nombre_completo","documento","email","telefono","estado_datos")
         VALUES ($1,$2,$3,$4,$5)
         RETURNING "id"`,
        [p.nombre_completo, p.numero_documento, p.email_principal, telefono, p.estado_datos],
      );
      idPorRef.set(p.ref, rows[0].id);
    }
    return idPorRef;
  }

  private async cargarMapaCodigos(qr: QueryRunner, tabla: string): Promise<Map<string, string>> {
    const rows: Array<{ id: string; codigo_importacion: string }> = await qr.query(
      `SELECT "id","codigo_importacion" FROM "${tabla}"`,
    );
    return new Map(rows.map((r) => [r.codigo_importacion, r.id]));
  }
}
