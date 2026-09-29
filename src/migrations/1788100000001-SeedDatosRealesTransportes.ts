import { MigrationInterface, QueryRunner } from 'typeorm';

// Datos oficiales de la operación 2026, tomados del Excel de la RMM
// ("2. Protocolo de reporte" para tarifas y mapeo escuela→ruta, las hojas "Ruta N"
// para la fórmula de puestos) y del PDF de solicitud del 5 de septiembre de 2026.
const ESCUELAS: Array<{ codigo: string; nombre: string; direccion: string; ruta: string }> = [
  { codigo: 'EMALFONSOLOPEZ', nombre: 'Escuela de Música Alfonso López', ruta: 'R1', direccion: 'Carrera 71A # 92 – 11 - Castilla (Cerca a la I.E. República de Uruguay)' },
  { codigo: 'EMARANJUEZ', nombre: 'Escuela de Música Aranjuez', ruta: 'R10', direccion: 'Carrera 51B # 88 – 6 - Aranjuez' },
  { codigo: 'EMBELEN', nombre: 'Escuela de Música Belén Parque Biblioteca', ruta: 'R3', direccion: 'Carrera 76 # 18A – 19 Belén Las Playas (Parque Biblioteca de Belén, entrada por la carrera 80 contigua a la Clínica Vida)' },
  { codigo: 'EMBELENRINCON', nombre: 'Escuela de Música Belén Rincón', ruta: 'R3', direccion: 'Calle 3D # 81A – 97 (Loma de los Bernal – A una cuadra y media del EURO)' },
  { codigo: 'EMBOSTON', nombre: 'Escuela de Música Bostón', ruta: 'R6', direccion: 'Calle 54A # 30-01 - ITM Fraternidad - Boston - Bloque 3er. piso' },
  { codigo: 'EMDOCEOCTUBRE', nombre: 'Escuela de Música Doce de Octubre', ruta: 'R1', direccion: 'Carrera 80 # 104B – 10 (Parque Biblioteca Doce de Octubre, entrada por la calle de la estación Doce de Octubre del Metro Cable)' },
  { codigo: 'EMPOBLADO', nombre: 'Escuela de Música El Poblado', ruta: 'R7', direccion: 'Calle 16 Sur # 45 – 13 (Diagonal al Parque de la Inflexión y/o de la Iglesia Santa María de los Ángeles)' },
  { codigo: 'EMESTADIO', nombre: 'Escuela de Música Estadio', ruta: 'R2', direccion: 'Carrera 74 # 52 – 56 - Los Colores (Frente a la entrada del supermercado "OR")' },
  { codigo: 'EMINDEPENDENCIAS', nombre: 'Escuela de Música Independencias', ruta: 'R8', direccion: 'Carrera 106 # 38 - 40 I.E. Carlos Vieco sede 20 de Julio - Al lado de la Unidad residencial Villas de Santa Mónica' },
  { codigo: 'EMMILAGROSA', nombre: 'Escuela de Música La Milagrosa', ruta: 'R4', direccion: 'Carrera 29A # 38F – 59 (Casa de Cultura Ávila)' },
  { codigo: 'EMLASNIEVES', nombre: 'Escuela de Música Las Nieves', ruta: 'R9', direccion: 'Calle 82 # 39 – 69 Manrique (Institución Educativa Las Nieves)' },
  { codigo: 'EMMIRAFLORES', nombre: 'Escuela de Música Miraflores', ruta: 'R5', direccion: 'Carrera 25 # 50A – 27 (Unidad Deportiva Miraflores - Contigua a la entrada vehicular de la U.R. Loyola)' },
  { codigo: 'EMMONTECARLO', nombre: 'Escuela de Música Montecarlo', ruta: 'R9', direccion: 'Carrera 36 # 85B – 77 - Manrique (Institución Educativa Montecarlo)' },
  { codigo: 'EMMORAVIA', nombre: 'Escuela de Música Moravia', ruta: 'R10', direccion: 'Calle 82A # 52 – 25 (Centro de Desarrollo Cultural)' },
  { codigo: 'EMMUTAR', nombre: 'Escuela de Música MUTAR', ruta: 'R8', direccion: 'San Javier - Calle 42C # 95 - 50 - C4ta' },
  { codigo: 'EMPEDREGAL', nombre: 'Escuela de Música Pedregal', ruta: 'R1', direccion: 'Calle 103 # 74A – 03 (Casa de Cultura Pedregal)' },
  { codigo: 'EMROBLEDO', nombre: 'Escuela de Música Robledo', ruta: 'R2', direccion: 'Carrera 69 # 73-105 (A media cuadra del "Rinconcito Ecuatoriano")' },
  { codigo: 'EMSANANTONIO', nombre: 'Escuela de Música San Antonio de Prado', ruta: 'R7', direccion: 'Calle 50E Sur # 75A – 94 (Parque Biblioteca San Antonio de Prado)' },
  { codigo: 'EMSANCRISTOBAL', nombre: 'Escuela de Música San Cristóbal', ruta: 'R2', direccion: 'Carrera 131 # 62 – 33 (Parque Biblioteca San Cristóbal)' },
  { codigo: 'EMSANJAVIER', nombre: 'Escuela de Música San Javier', ruta: 'R8', direccion: 'Calle 44 # 101 – 43 (A dos cuadras y media de la estación San Javier subiendo por San Juan)' },
  { codigo: 'EMSANTAELENA', nombre: 'Escuela de Música Santa Elena', ruta: 'R5', direccion: 'Km 15 vía Santa Elena (Institución Educativa Santa Elena)' },
  { codigo: 'EMSANTAFE', nombre: 'Escuela de Música Santa Fe', ruta: 'R3', direccion: 'Carrera 65 # 2B-28' },
  { codigo: 'EMTANGO', nombre: 'Escuela de Música Tango', ruta: 'R6', direccion: 'Carrera 42 # 52 - 33 - Palacio de Bellas Artes (La Playa)' },
  { codigo: 'EMTRINIDAD', nombre: 'Escuela de Música Trinidad', ruta: 'R3', direccion: 'Calle 26 # 65C - 100 - sede Santísima Trinidad de la I.E. Benjamín Herrera' },
  { codigo: 'EMVILLASOCORRO', nombre: 'Escuela de Música Villa del Socorro', ruta: 'R10', direccion: 'Carrera 48 # 103B – 01 (Contigua a la Estación de Policía de Santa Cruz)' },
  { codigo: 'EMVILLAHERMOSA', nombre: 'Escuela de Música Villa Hermosa', ruta: 'R6', direccion: 'Calle 65C # 39A - 35' },
  { codigo: 'EMVILLALAURA', nombre: 'Escuela de Música Villa Laura', ruta: 'R8', direccion: 'Calle 34D # 91 – 76 (Cerca al convento de la Madre Laura)' },
  { codigo: 'EMVILLATINA', nombre: 'Escuela de Música Villatina', ruta: 'R4', direccion: 'Calle 52A # 12 – 00 (Casa de Cultura Las Estancias)' },
];

// Nombres tal como salen en el documento oficial que recibe la transportadora.
const TIPOS_VEHICULO = [
  { nombre: 'CAMIONETA', min: 1, max: 4 },
  { nombre: 'MICRO - 5 A 15 PUESTOS', min: 5, max: 15 },
  { nombre: 'BUSETA - 16 A 25 PUESTOS', min: 16, max: 25 },
  { nombre: 'BUS - 26 A 42 PUESTOS', min: 26, max: 42 },
];

const TARIFAS_2026: Record<string, Record<string, number>> = {
  URBANA: { CAMIONETA: 400000, 'MICRO - 5 A 15 PUESTOS': 450000, 'BUSETA - 16 A 25 PUESTOS': 560000, 'BUS - 26 A 42 PUESTOS': 610000 },
  'RURAL 1': { CAMIONETA: 400000, 'MICRO - 5 A 15 PUESTOS': 690000, 'BUSETA - 16 A 25 PUESTOS': 790000, 'BUS - 26 A 42 PUESTOS': 890000 },
  'RURAL 2': { CAMIONETA: 400000, 'MICRO - 5 A 15 PUESTOS': 890000, 'BUSETA - 16 A 25 PUESTOS': 995000, 'BUS - 26 A 42 PUESTOS': 1150000 },
};

const RUTAS = [
  { codigo: 'R1', nombre: '1 - ALFONSO LÓPEZ - DOCE DE OCTUBRE - PEDREGAL', zona: 'URBANA', recorrido: 'IDA_Y_REGRESO', hora: '08:00' },
  { codigo: 'R2', nombre: '2 - SAN CRISTÓBAL - ROBLEDO - ESTADIO', zona: 'RURAL 1', recorrido: 'IDA_Y_REGRESO', hora: '07:30' },
  { codigo: 'R3', nombre: '3 - SANTA FE - TRINIDAD - BELÉN PARQUE', zona: 'URBANA', recorrido: 'IDA_Y_REGRESO', hora: '08:00' },
  { codigo: 'R4', nombre: '4 - VILLATINA - LA MILAGROSA', zona: 'URBANA', recorrido: 'IDA_Y_REGRESO', hora: '08:00' },
  { codigo: 'R5', nombre: '5 - MIRAFLORES - SANTA ELENA', zona: 'RURAL 2', recorrido: 'IDA_Y_REGRESO', hora: '07:30' },
  { codigo: 'R6', nombre: '6 - VILLA HERMOSA - BOSTON - BELLAS ARTES', zona: 'URBANA', recorrido: 'IDA_Y_REGRESO', hora: '08:00' },
  { codigo: 'R7', nombre: '7 - SAN ANTONIO - POBLADO', zona: 'RURAL 1', recorrido: 'IDA_Y_REGRESO', hora: '07:30' },
  { codigo: 'R8', nombre: '8 - SAN JAVIER - INDEPENDENCIAS - VILLA LAURA', zona: 'URBANA', recorrido: 'IDA_Y_REGRESO', hora: '08:00' },
  { codigo: 'R9', nombre: '9 - MONTECARLO - LAS NIEVES', zona: 'URBANA', recorrido: 'IDA_Y_REGRESO', hora: '08:00' },
  { codigo: 'R10', nombre: '10 - VILLA DEL SOCORRO - ARANJUEZ - MORAVIA', zona: 'URBANA', recorrido: 'IDA_Y_REGRESO', hora: '08:00' },
  { codigo: 'R11', nombre: '11 - BELÉN RINCÓN - CASA DE LA MÚSICA (CORO INICIAL)', zona: 'URBANA', recorrido: 'SOLO_IDA', hora: '08:00' },
];

// Solo estos seis suman puestos extra; el resto ocupa únicamente el suyo.
const INSTRUMENTOS: Array<[string, number]> = [
  ['Contrabajo', 2], ['Tuba', 2],
  ['Violonchelo', 1], ['Trombón', 1], ['Corno', 1], ['Barítono / Eufonio', 1],
  ['Violín', 0], ['Viola', 0], ['Clarinete', 0], ['Clarinete bajo', 0],
  ['Trompeta', 0], ['Flauta', 0], ['Fagot', 0], ['Oboe', 0],
  ['Saxofón alto', 0], ['Saxofón tenor', 0], ['Saxofón barítono', 0],
  ['Percusión', 0], ['Voz', 0],
];

export class SeedDatosRealesTransportes1788100000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transporte_agrupaciones"
        ADD COLUMN "ruta_id" UUID,
        ADD CONSTRAINT "FK_transporte_agrupaciones_ruta"
          FOREIGN KEY ("ruta_id") REFERENCES "transporte_rutas"("id") ON DELETE SET NULL
    `);

    for (const zona of Object.keys(TARIFAS_2026)) {
      await queryRunner.query(
        `INSERT INTO "transporte_zonas" ("nombre") VALUES ($1) ON CONFLICT ("nombre") DO NOTHING`,
        [zona],
      );
    }

    for (const tipo of TIPOS_VEHICULO) {
      await queryRunner.query(
        `INSERT INTO "transporte_tipos_vehiculo" ("nombre", "puestos_min", "puestos_max")
         VALUES ($1, $2, $3) ON CONFLICT ("nombre") DO NOTHING`,
        [tipo.nombre, tipo.min, tipo.max],
      );
    }

    for (const [zona, porVehiculo] of Object.entries(TARIFAS_2026)) {
      for (const [vehiculo, valor] of Object.entries(porVehiculo)) {
        await queryRunner.query(
          `INSERT INTO "transporte_tarifas" ("zona_id", "tipo_vehiculo_id", "valor", "vigente_desde")
           SELECT z."id", v."id", $3, '2026-01-01'
           FROM "transporte_zonas" z, "transporte_tipos_vehiculo" v
           WHERE z."nombre" = $1 AND v."nombre" = $2
           ON CONFLICT ("zona_id", "tipo_vehiculo_id", "vigente_desde") DO NOTHING`,
          [zona, vehiculo, valor],
        );
      }
    }

    for (const [nombre, puestos] of INSTRUMENTOS) {
      await queryRunner.query(
        `INSERT INTO "transporte_instrumentos" ("nombre", "puestos_adicionales")
         VALUES ($1, $2) ON CONFLICT ("nombre") DO NOTHING`,
        [nombre, puestos],
      );
    }

    for (const ruta of RUTAS) {
      await queryRunner.query(
        `INSERT INTO "transporte_rutas" ("nombre", "codigo", "zona_id", "tipo_recorrido", "hora_recogida")
         SELECT $1, $2, z."id", $4::"transporte_rutas_tipo_recorrido_enum", $5::time
         FROM "transporte_zonas" z WHERE z."nombre" = $3
         ON CONFLICT ("codigo") DO NOTHING`,
        [ruta.nombre, ruta.codigo, ruta.zona, ruta.recorrido, ruta.hora],
      );
    }

    // Las tres escuelas que ya existían se completan con su nombre y dirección
    // oficiales en vez de duplicarlas: conservan los estudiantes ya asociados.
    for (const escuela of ESCUELAS) {
      await queryRunner.query(
        `INSERT INTO "escuelas" ("codigo", "nombre", "direccion", "activa")
         VALUES ($1, $2, $3, true)
         ON CONFLICT ("codigo") DO UPDATE SET "nombre" = EXCLUDED."nombre", "direccion" = EXCLUDED."direccion"`,
        [escuela.codigo, escuela.nombre, escuela.direccion],
      );

      await queryRunner.query(
        `INSERT INTO "transporte_escuela_ruta" ("escuela_id", "ruta_id")
         SELECT e."id", r."id"
         FROM "escuelas" e, "transporte_rutas" r
         WHERE e."codigo" = $1 AND r."codigo" = $2
         ON CONFLICT ("escuela_id") DO UPDATE SET "ruta_id" = EXCLUDED."ruta_id"`,
        [escuela.codigo, escuela.ruta],
      );
    }

    await queryRunner.query(`
      INSERT INTO "transporte_agrupaciones" ("nombre", "codigo", "destino_especial", "requiere_marca_distintiva")
      VALUES
        ('Orquesta Sinfónica Inicial', 'OSI', NULL, false),
        ('Orquesta Sinfónica Intermedia', 'OSINT', NULL, false),
        ('Banda Sinfónica Juvenil', 'BSJ', NULL, false),
        ('Coro Inicial', 'CORO', NULL, false),
        ('Ensamble Neuro', 'NEURO', 'Escuela de Música Belén Parque Biblioteca', true)
      ON CONFLICT ("codigo") DO NOTHING
    `);

    // El Coro Inicial viaja en la Ruta 11 sin importar de qué escuela venga.
    await queryRunner.query(`
      UPDATE "transporte_agrupaciones"
      SET "ruta_id" = (SELECT "id" FROM "transporte_rutas" WHERE "codigo" = 'R11')
      WHERE "codigo" = 'CORO'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "transporte_agrupaciones" WHERE "codigo" IN ('OSI','OSINT','BSJ','CORO','NEURO')`);
    await queryRunner.query(`DELETE FROM "transporte_escuela_ruta"`);
    await queryRunner.query(`DELETE FROM "transporte_rutas"`);
    await queryRunner.query(`DELETE FROM "transporte_tarifas"`);
    await queryRunner.query(`DELETE FROM "transporte_tipos_vehiculo"`);
    await queryRunner.query(`DELETE FROM "transporte_instrumentos"`);
    await queryRunner.query(`DELETE FROM "transporte_zonas"`);

    // Solo se borran las escuelas creadas por esta migración; las tres previas
    // recuperan el nombre que tenían antes.
    const codigosCreados = ESCUELAS.map((e) => e.codigo).filter(
      (c) => !['EMBELEN', 'EMPOBLADO', 'EMROBLEDO'].includes(c),
    );
    await queryRunner.query(`DELETE FROM "escuelas" WHERE "codigo" = ANY($1)`, [codigosCreados]);
    await queryRunner.query(
      `UPDATE "escuelas" SET "nombre" = 'Escuela de Música Belén', "direccion" = NULL WHERE "codigo" = 'EMBELEN'`);
    await queryRunner.query(
      `UPDATE "escuelas" SET "direccion" = NULL WHERE "codigo" IN ('EMPOBLADO','EMROBLEDO')`);

    await queryRunner.query(`
      ALTER TABLE "transporte_agrupaciones"
        DROP CONSTRAINT "FK_transporte_agrupaciones_ruta",
        DROP COLUMN "ruta_id"
    `);
  }
}
