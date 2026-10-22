// 1792600000000-CreateEquipoInterno.ts
//
// Crea el módulo de equipo interno (personas + vinculaciones + catálogos) y
// siembra los catálogos que llegaron completos desde el Excel de la
// Fundación UdeA (EQUIPO_TOTAL_RED_POR_ROL.xlsx, hojas LABORAL FORMACIÓN,
// LABORAL ADMINISTRATIVO y PS). Las 199 personas y sus vinculaciones reales
// NO se siembran aquí todavía — llegan en una migración aparte cuando se
// tenga el resto de los datos (el perfil FUN-005 también quedó incompleto y
// se deja fuera por ahora).
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEquipoInterno1792600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_cargos_grupo_enum" AS ENUM (
        'LABORAL_FORMACION', 'LABORAL_ADMINISTRATIVO', 'PRESTACION_SERVICIOS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_interno_personas_estado_datos_enum" AS ENUM ('COMPLETO', 'PENDIENTE')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_tipo_vinculacion_enum" AS ENUM ('LABORAL', 'PRESTACION_SERVICIOS')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_dedicacion_enum" AS ENUM (
        'TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'TREINTA_HORAS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_forma_pago_enum" AS ENUM ('QUINCENAL', 'MENSUAL', 'PAGO_UNICO')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."equipo_vinculaciones_estado_vinculacion_enum" AS ENUM ('ACTIVO', 'PENDIENTE_CONTRATACION')
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_contratos_interadministrativos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "numero" character varying(30) NOT NULL,
        "anio" integer NOT NULL,
        "entidad_contratante" character varying(255) NOT NULL,
        "entidad_ejecutora" character varying(255) NOT NULL,
        "objeto" text NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipo_contratos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_contratos_codigo" UNIQUE ("codigo_importacion")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_cargos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "codigo" character varying(100) NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "grupo" "public"."equipo_cargos_grupo_enum" NOT NULL,
        CONSTRAINT "PK_equipo_cargos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_cargos_codigo_importacion" UNIQUE ("codigo_importacion"),
        CONSTRAINT "UQ_equipo_cargos_codigo" UNIQUE ("codigo")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_objetos_contrato" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "texto" text NOT NULL,
        CONSTRAINT "PK_equipo_objetos_contrato" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_objetos_contrato_codigo" UNIQUE ("codigo_importacion")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_justificaciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "texto" text NOT NULL,
        CONSTRAINT "PK_equipo_justificaciones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_justificaciones_codigo" UNIQUE ("codigo_importacion")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_perfiles_funciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo_importacion" character varying(30) NOT NULL,
        "cargo_referencia" character varying(150) NOT NULL,
        "items" text NOT NULL,
        CONSTRAINT "PK_equipo_perfiles_funciones" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_perfiles_funciones_codigo" UNIQUE ("codigo_importacion")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_interno_personas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre_completo" character varying(200) NOT NULL,
        "tipo_documento" "public"."tipo_documento_enum",
        "documento" character varying(20),
        "email" character varying(150),
        "telefono" character varying(20),
        "cuenta_bancaria" character varying(50),
        "eps" character varying(100),
        "arl" character varying(100),
        "afp" character varying(100),
        "cesantias" character varying(100),
        "estado_datos" "public"."equipo_interno_personas_estado_datos_enum" NOT NULL DEFAULT 'COMPLETO',
        "activo" boolean NOT NULL DEFAULT true,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "actualizado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipo_interno_personas" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_equipo_interno_personas_documento" UNIQUE ("documento")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "equipo_vinculaciones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "persona_id" uuid NOT NULL,
        "cargo_id" uuid NOT NULL,
        "contrato_interadministrativo_id" uuid NOT NULL,
        "objeto_contrato_id" uuid,
        "justificacion_id" uuid,
        "perfil_funcion_id" uuid,
        "grupo" "public"."equipo_cargos_grupo_enum" NOT NULL,
        "tipo_vinculacion" "public"."equipo_vinculaciones_tipo_vinculacion_enum" NOT NULL,
        "dedicacion" "public"."equipo_vinculaciones_dedicacion_enum",
        "forma_pago" "public"."equipo_vinculaciones_forma_pago_enum",
        "fecha_inicio" date,
        "fecha_fin" date,
        "monto" numeric(14,2),
        "horario" character varying(100),
        "estado_vinculacion" "public"."equipo_vinculaciones_estado_vinculacion_enum" NOT NULL,
        "creado_en" timestamptz NOT NULL DEFAULT now(),
        "actualizado_en" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_equipo_vinculaciones" PRIMARY KEY ("id"),
        CONSTRAINT "FK_equipo_vinculaciones_persona" FOREIGN KEY ("persona_id")
          REFERENCES "equipo_interno_personas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_equipo_vinculaciones_cargo" FOREIGN KEY ("cargo_id")
          REFERENCES "equipo_cargos"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_contrato" FOREIGN KEY ("contrato_interadministrativo_id")
          REFERENCES "equipo_contratos_interadministrativos"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_objeto_contrato" FOREIGN KEY ("objeto_contrato_id")
          REFERENCES "equipo_objetos_contrato"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_justificacion" FOREIGN KEY ("justificacion_id")
          REFERENCES "equipo_justificaciones"("id"),
        CONSTRAINT "FK_equipo_vinculaciones_perfil_funcion" FOREIGN KEY ("perfil_funcion_id")
          REFERENCES "equipo_perfiles_funciones"("id"),
        CONSTRAINT "UQ_equipo_vinculaciones_persona_contrato_cargo_fecha"
          UNIQUE ("persona_id", "contrato_interadministrativo_id", "cargo_id", "fecha_inicio")
      )
    `);

    await this.seedContratos(queryRunner);
    await this.seedCargos(queryRunner);
    await this.seedObjetosContrato(queryRunner);
    await this.seedJustificaciones(queryRunner);
    await this.seedPerfilesFuncion(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_vinculaciones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_interno_personas"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_perfiles_funciones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_justificaciones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_objetos_contrato"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_cargos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "equipo_contratos_interadministrativos"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_estado_vinculacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_forma_pago_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_dedicacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_vinculaciones_tipo_vinculacion_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_interno_personas_estado_datos_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."equipo_cargos_grupo_enum"`);
  }

  private async seedContratos(qr: QueryRunner): Promise<void> {
    await qr.query(
      `INSERT INTO "equipo_contratos_interadministrativos"
        ("codigo_importacion","numero","anio","entidad_contratante","entidad_ejecutora","objeto")
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        'CIA-001', '4600108056', 2026,
        'Secretaría de Cultura Ciudadana - Distrito de Medellín',
        'Universidad de Antioquia - Facultad de Artes',
        'Contrato interadministrativo N°4600108056 de 2026 para la operación de la Red de Músicas de Medellín, ' +
        'mediante la formación musical de niños, niñas adolescentes y jóvenes de la ciudad. Celebrado entre la ' +
        'Secretaria de Cultura Ciudadana del Distrito Especial de Ciencia,Tecnología e Innovación de Medellín y ' +
        'la Universidad de Antioquia, Facultad de Artes.',
      ],
    );
  }

  private async seedCargos(qr: QueryRunner): Promise<void> {
    const cargos: Array<[string, string, string, string]> = [
      ['CAR-001', 'ARTISTA_FORMADOR', 'ARTISTA FORMADOR', 'LABORAL_FORMACION'],
      ['CAR-002', 'DIRECTOR', 'DIRECTOR', 'LABORAL_FORMACION'],
      ['CAR-003', 'DIRECTOR_ESCUELA_MUSICAS_CANTADAS', 'DIRECTOR ESCUELA MÚSICAS CANTADAS', 'LABORAL_FORMACION'],
      ['CAR-004', 'APOYO_ADMINISTRATIVO', 'APOYO ADMINISTRATIVO', 'LABORAL_ADMINISTRATIVO'],
      ['CAR-005', 'APOYO_ADMINISTRATIVO_AI', 'APOYO ADMINISTRATIVO (AI)', 'LABORAL_ADMINISTRATIVO'],
      ['CAR-006', 'COORDINADOR_DE_FORMACION', 'COORDINADOR DE FORMACIÓN', 'PRESTACION_SERVICIOS'],
      ['CAR-007', 'DIRECTOR_AGRUPACION_INTEGRADA_Y_TALLERISTA', 'DIRECTOR AGRUPACION INTEGRADA Y TALLERISTA', 'PRESTACION_SERVICIOS'],
      ['CAR-008', 'DIRECTOR_AGRUPACION_INTEGRADA', 'DIRECTOR AGRUPACION INTEGRADA', 'PRESTACION_SERVICIOS'],
      ['CAR-009', 'ARTISTA_FORMADOR_O_TALLERISTA', 'ARTISTA FORMADOR O TALLERISTA', 'PRESTACION_SERVICIOS'],
      ['CAR-010', 'LUTHIERS_DE_CUERDAS', 'LUTHIERS DE CUERDAS', 'PRESTACION_SERVICIOS'],
      ['CAR-011', 'LUTHIER_DE_PERCUSION', 'LUTHIER DE PERCUSIÓN', 'PRESTACION_SERVICIOS'],
      ['CAR-012', 'LUTHIER_DE_ELEMENTOS_ELECTRONICOS', 'LUTHIER DE ELEMENTOS ELECTRÓNICOS', 'PRESTACION_SERVICIOS'],
      ['CAR-013', 'LUTHIER_DE_VIENTOS', 'LUTHIER DE VIENTOS', 'PRESTACION_SERVICIOS'],
      ['CAR-014', 'LUTHIERS_DE_VIENTOS_ASISTENCIAL', 'LUTHIERS DE VIENTOS ASISTENCIAL', 'PRESTACION_SERVICIOS'],
      ['CAR-015', 'GESTION_PEDAGOGICO_BRONCES', 'GESTIÓN PEDAGÓGICO BRONCES', 'PRESTACION_SERVICIOS'],
      ['CAR-016', 'GESTION_PEDAGOGICO_MADERAS', 'GESTIÓN PEDAGÓGICO MADERAS', 'PRESTACION_SERVICIOS'],
      ['CAR-017', 'GESTION_PEDAGOGICO_CUERDAS_PULSADAS_Y_FROTADAS', 'GESTIÓN PEDAGÓGICO CUERDAS PULSADAS Y FROTADAS', 'PRESTACION_SERVICIOS'],
      ['CAR-018', 'GESTION_INICIACION_MUSICAL', 'GESTIÓN INICIACIÓN MUSICAL', 'PRESTACION_SERVICIOS'],
      ['CAR-019', 'GESTION_CANTO_Y_MOVIMIENTO_DIRECTOR_DE_CORO', 'GESTIÓN CANTO Y MOVIMIENTO, DIRECTOR DE CORO', 'PRESTACION_SERVICIOS'],
      ['CAR-020', 'GESTION_NEURODIVERSIDAD', 'GESTIÓN NEURODIVERSIDAD', 'PRESTACION_SERVICIOS'],
      ['CAR-021', 'COORDINADOR_ADMINISTRATIVO', 'COORDINADOR ADMINISTRATIVO', 'PRESTACION_SERVICIOS'],
      ['CAR-022', 'GESTION_ADMINISTRATIVO_OPERATIVO_Y_LOGISTICO', 'GESTIÓN ADMINISTRATIVO, OPERATIVO Y LOGISTICO', 'PRESTACION_SERVICIOS'],
      ['CAR-023', 'TECNICO_ADMINISTRATIVO_Y_OPERATIVO', 'TÉCNICO ADMINISTRATIVO Y OPERATIVO', 'PRESTACION_SERVICIOS'],
      ['CAR-024', 'GESTION_JURIDICA', 'GESTIÓN JURIDICA', 'PRESTACION_SERVICIOS'],
      ['CAR-025', 'AUXILIAR_DE_MANTENIMIENTO_DE_OBRAS_MENORES', 'AUXILIAR DE MANTENIMIENTO DE OBRAS MENORES', 'PRESTACION_SERVICIOS'],
      ['CAR-026', 'GESTION_TECNICA_Y_ADMINISTRATIVA', 'GESTIÓN TÉCNICA Y ADMINISTRATIVA', 'PRESTACION_SERVICIOS'],
      ['CAR-027', 'GESTION_TECNICA_Y_ADMINISTRATIVA_CON_AGRUPACION_INTEGRADA', 'GESTIÓN TÉCNICA Y ADMINISTRATIVA CON AGRUPACIÓN INTEGRADA', 'PRESTACION_SERVICIOS'],
      ['CAR-028', 'COORDINADOR_DE_PROYECCION_Y_ACADEMICO', 'COORDINADOR DE PROYECCIÓN Y ACÁDEMICO', 'PRESTACION_SERVICIOS'],
      ['CAR-029', 'GESTION_DE_PRODUCCION_Y_CIRCULACION', 'GESTIÓN DE PRODUCCIÓN Y CIRCULACIÓN', 'PRESTACION_SERVICIOS'],
      ['CAR-030', 'GESTION_DE_PEDAGOGICA_DE_CONJUNTOS_INSTRUMENTALES', 'GESTIÓN DE PEDAGOGICA DE CONJUNTOS INSTRUMENTALES', 'PRESTACION_SERVICIOS'],
      ['CAR-031', 'AUXILIAR_PRODUCCION_LOGISTICA', 'AUXILIAR PRODUCCIÓN & LOGÍSTICA', 'PRESTACION_SERVICIOS'],
      ['CAR-032', 'COORDINACION_SOCIAL_Y_DE_CONOCIMIENTO', 'COORDINACIÓN SOCIAL Y DE CONOCIMIENTO', 'PRESTACION_SERVICIOS'],
      ['CAR-033', 'GESTION_SOCIAL_Y_HUMANA', 'GESTIÓN SOCIAL Y HUMANA', 'PRESTACION_SERVICIOS'],
      ['CAR-034', 'GESTION_DE_DIVULGACION', 'GESTIÓN DE DIVULGACIÓN', 'PRESTACION_SERVICIOS'],
      ['CAR-035', 'GESTION_DE_INVESTIGACION', 'GESTION DE INVESTIGACIÓN', 'PRESTACION_SERVICIOS'],
      ['CAR-036', 'COORDINADOR_DE_MOVILIZACION', 'COORDINADOR DE MOVILIZACIÓN', 'PRESTACION_SERVICIOS'],
      ['CAR-037', 'GESTION_DE_DESARROLLO_TIC', 'GESTIÓN DE DESARROLLO TIC', 'PRESTACION_SERVICIOS'],
      ['CAR-038', 'TECNICO_ADMINISTRATIVO_Y_FINANCIERO', 'TECNICO ADMINISTRATIVO Y FINANCIERO', 'PRESTACION_SERVICIOS'],
      ['CAR-039', 'GESTION_ADMINISTRATIVO_Y_FINANCIERA', 'GESTIÓN ADMINISTRATIVO Y FINANCIERA', 'PRESTACION_SERVICIOS'],
      ['CAR-040', 'GESTION_CULTURAL', 'GESTION CULTURAL', 'PRESTACION_SERVICIOS'],
      ['CAR-041', 'DESARROLLADOR_WEB_MASTER', 'DESARROLLADOR WEB MASTER', 'PRESTACION_SERVICIOS'],
    ];
    for (const [codigoImportacion, codigo, nombre, grupo] of cargos) {
      await qr.query(
        `INSERT INTO "equipo_cargos" ("codigo_importacion","codigo","nombre","grupo") VALUES ($1,$2,$3,$4)`,
        [codigoImportacion, codigo, nombre, grupo],
      );
    }
  }

  private async seedObjetosContrato(qr: QueryRunner): Promise<void> {
    const objetos: Array<[string, string]> = [
      ['OBJ-001', 'Desarrollar procesos de formación musical en la Escuela de Música asignada de la Red de Escuelas de Música de Medellín, orientados al fortalecimiento de las capacidades artísticas, creativas y humanas de los participantes, mediante la implementación de los lineamientos pedagógicos e institucionales establecidos por el programa.'],
      ['OBJ-002', 'Apoyar la gestión administrativa de la Escuela de Música asignada de la Red de Escuelas de Música de Medellín, contribuyendo al desarrollo de los procesos documentales, operativos, logísticos y de atención a la comunidad educativa requeridos para el adecuado funcionamiento del programa.'],
      ['OBJ-003', 'Prestar servicios profesionales para liderar y acompañar la gestión pedagógica de la Red de Escuelas de Música de Medellín, mediante la coordinación de los equipos de formación, la implementación de la apuesta pedagógica institucional, la articulación de lineamientos curriculares y metodológicos, y el fortalecimiento de los procesos pedagógicos, investigativos, tecnológicos y de gestión cultural de las diferentes subáreas del programa.'],
      ['OBJ-004', 'Prestar servicios profesionales para liderar los procesos de formación artística y territorial de las Agrupaciones Integradas de la Red de Escuelas de Música de Medellín, garantizando la implementación del Plan de Formación Pedagógico y Musical, la articulación de los procesos formativos y de reflexión social, el acompañamiento y seguimiento de los equipos de trabajo asignados, y el desarrollo de metodologías basadas en proyectos, laboratorios experienciales, creación e investigación, de conformidad con los lineamientos establecidos por la Secretaría de Cultura Ciudadana, la Universidad de Antioquia y la Dirección General del programa.'],
      ['OBJ-005', 'Prestar servicios profesionales para acompañar y fortalecer los procesos formativos de la Red de Escuelas de Música de Medellín, mediante el diseño e implementación de estrategias pedagógicas, contenidos y metodologías que favorezcan el desarrollo integral de los participantes.'],
      ['OBJ-006', 'Prestar servicios técnicos en lutheria para el mantenimiento preventivo y correctivo de los instrumentos necesarios para los procesos formativos de la Red de Escuelas de Música de Medellín, mediante la reparación y capacitación del buen uso de los insrumentos que permitan cumplir su vida util para dar continuidad a los procesos formativoa de los participantes.'],
      ['OBJ-007', 'Prestar asistencia en lutheria para el mantenimiento preventivo y correctivo de los instrumentos necesarios para los procesos formativos de la Red de Escuelas de Música de Medellín, mediante la reparación y capacitación del buen uso de los insrumentos que permitan cumplir su vida util para dar continuidad a los procesos formativoa de los participantes.'],
      ['OBJ-008', 'Prestar servicios profesionales para acompañar la gestión pedagógica y territorial de las áreas asignadas de la Red de Escuelas de Música de Medellín, mediante la asesoría a los procesos formativos, el seguimiento a la implementación de proyectos y la evaluación de acciones orientadas al fortalecimiento de la experiencia educativa y la transformación social.'],
      ['OBJ-009', 'Prestar servicios profesionales para desarrollar y acompañar los procesos de gestión pedagógica y territorial de las áreas y proyectos asignados de la Red de Escuelas de Música de Medellín, mediante la implementación de estrategias de asesoría, seguimiento, evaluación y fortalecimiento de los procesos formativos, comunitarios y de garantía de derechos, de conformidad con los lineamientos institucionales del programa.'],
      ['OBJ-010', 'Prestar servicios profesionales para acompañar la gestión pedagógica y territorial de las áreas asignadas de la Red de Escuelas de Música de Medellín, mediante la asesoría, seguimiento y fortalecimiento de los procesos formativos, comunitarios y administrativos asociados al desarrollo del programa.'],
      ['OBJ-011', 'Prestar servicios profesionales para acompañar la gestión pedagógica y territorial de las áreas asignadas de la Red de Escuelas de Música de Medellín, mediante la asesoría a los equipos de formación, el seguimiento a la implementación de proyectos y el fortalecimiento de los procesos educativos, comunitarios y de garantía de derechos.'],
      ['OBJ-012', 'Prestar servicios profesionales para liderar la implementación y seguimiento de los procesos pedagógicos, formativos y territoriales de las Escuelas de Música o Agrupaciones Integradas asignadas de la Red de Escuelas de Música de Medellín, de conformidad con los lineamientos institucionales del programa.'],
      ['OBJ-013', 'Prestar servicios profesionales para apoyar la gestión pedagógica y territorial de las áreas y proyectos asignados de la Red de Escuelas de Música de Medellín, contribuyendo al fortalecimiento de los procesos formativos, comunitarios y de transformación social del programa.'],
      ['OBJ-014', 'Prestar servicios profesionales para apoyar la gestión administrativa de la Escuela de Música asignada de la Red de Escuelas de Música de Medellín, contribuyendo al desarrollo de los procesos documentales, operativos, logísticos y de atención a la comunidad educativa requeridos para el adecuado funcionamiento del programa.'],
      ['OBJ-015', 'Prestar servicios profesionales para apoyar la coordinación de los procesos de proyección, circulación y articulación institucional de la Red de Escuelas de Música de Medellín, garantizando la programación, gestión y seguimiento de las actividades artísticas y formativas del programa.'],
      ['OBJ-016', 'Prestar servicios de gestor en producción para fortalecer los procesos logísticos, operativos y de circulación artística de la Red de Escuelas de Música de Medellín, garantizando el adecuado desarrollo de eventos, presentaciones y actividades institucionales.'],
      ['OBJ-017', 'Prestar servicios profesionales en gestión pedagogica y conjuntos instrumentales para acompañar y fortalecer los procesos de proyección artística, formación musical y gestión del conocimiento de las Agrupaciones Integradas y Escuelas de Música de la Red de Escuelas de Música de Medellín.'],
      ['OBJ-018', 'Prestar servicios de apoyo a la gestión para fortalecer los procesos logísticos, operativos y de circulación artística de la Red de Escuelas de Música de Medellín, garantizando la adecuada administración de recursos, instrumentos y actividades de proyección del programa.'],
      ['OBJ-019', 'Prestar servicios de apoyo a la gestión para fortalecer los procesos logísticos y de circulación artística de la Red de Escuelas de Música de Medellín, garantizando la administración de recursos, instrumentos y requerimientos operativos asociados a las actividades del programa.'],
      ['OBJ-020', 'Prestar servicios profesionales para liderar los procesos de bienestar, acompañamiento social y fortalecimiento comunitario de la Red de Escuelas de Música de Medellín, contribuyendo a la garantía de derechos, la convivencia y la transformación social promovida por el programa.'],
      ['OBJ-021', 'Prestar servicios en gestion social para la implementación de las estrategias de Gestión Humana y Social de la Red de Escuelas de Música de Medellín, promoviendo el bienestar, la convivencia, el trabajo en equipo y el fortalecimiento de los procesos formativos y comunitarios del programa.'],
      ['OBJ-022', 'Prestar servicios profesionales para apoyar la gestión de comunicaciones de la Red de Escuelas de Música de Medellín, mediante el desarrollo de estrategias de visibilización, divulgación y promoción de los procesos, resultados e impactos del programa.'],
      ['OBJ-023', 'Prestar servicios profesionales para implemengtar estrategias en el Proyecto Escuela de la Red de Músicas de Medellín, promoviendo procesos de investigación, memoria, participación comunitaria y fortalecimiento de las experiencias formativas en las Escuelas de Música.'],
      ['OBJ-024', 'Contrato interadministrativo N°4600108056 de 2026 para la operación de la Red de Músicas de Medellín, mediante la formación musical de niños, niñas adolescentes y jóvenes de la ciudad. Celebrado entre la Secretaria de Cultura Ciudadana del Distrito Especial de Ciencia,Tecnología e Innovación de Medellín y la Universidad de Antioquia, Facultad de Artes.'],
      ['OBJ-025', 'Prestar servicios profesionales para el fortalecimiento de la gestión cultural, territorial y estratégica de la Red de Músicas de Medellín, mediante el diseño de estrategias de articulación, la consolidación de alianzas comunitarias e institucionales, la caracterización de actores de las Escuelas de Música y la sistematización de experiencias del programa, de acuerdo con los lineamientos de la Dirección General'],
    ];
    for (const [codigoImportacion, texto] of objetos) {
      await qr.query(
        `INSERT INTO "equipo_objetos_contrato" ("codigo_importacion","texto") VALUES ($1,$2)`,
        [codigoImportacion, texto],
      );
    }
  }

  private async seedJustificaciones(qr: QueryRunner): Promise<void> {
    const justificaciones: Array<[string, string]> = [
      ['JUS-001', 'En el marco de la ejecución del Contrato Interadministrativo N.4600108056 de 2026 y conforme a las necesidades pedagógicas y operativas identificadas durante el desarrollo de los procesos de formación de la Red de Escuelas de Música de Medellín, se hace necesario formalizar el contrato laboral con el fin de garantizar la continuidad y el fortalecimiento de las actividades formativas, de creación y proyección, contribuyendo al cumplimiento de las metas y objetivos establecidos para el proyecto.'],
      ['JUS-002', 'En el marco de la ejecución del Contrato Interadministrativo N.4600108056de 2026 y conforme a las necesidades pedagógicas y operativas identificadas durante el desarrollo de los procesos de formación de la Red de Escuelas de Música de Medellín, se hace necesario formalizar el contrato laboral con el fin de garantizar la continuidad y el fortalecimiento de las actividades formativas, de creación y proyección, contribuyendo al cumplimiento de las metas y objetivos establecidos para el proyecto.'],
      ['JUS-003', 'En el marco de la ejecución del Contrato Interadministrativo N.°4600108056 de 2026 y conforme a las necesidades pedagógicas y operativas identificadas durante el desarrollo de los procesos de formación de la Red de Escuelas de Música de Medellín, se hace necesario formalizar el contrato laboral con el fin de garantizar la continuidad y el fortalecimiento de las actividades formativas, de creación y proyección, contribuyendo al cumplimiento de las metas y objetivos establecidos para el proyecto.'],
      ['JUS-004', 'En el marco de la ejecución del Contrato Interadministrativo N.° xxxxxxx de 2026 y conforme a las necesidades pedagógicas y operativas identificadas durante el desarrollo de los procesos de formación de la Red de Escuelas de Música de Medellín, se hace necesario adicionar el contrato de prestación de servicios con el fin de garantizar la continuidad y el fortalecimiento de las actividades formativas, de creación y proyección, contribuyendo al cumplimiento de las metas y objetivos establecidos para el proyecto.'],
      ['JUS-005', 'Apoyar la gestión administrativa de la Escuela de Música asignada de la Red de Escuelas de Música de Medellín, contribuyendo al desarrollo de los procesos documentales, operativos, logísticos y de atención a la comunidad educativa requeridos para el adecuado funcionamiento del programa.'],
    ];
    for (const [codigoImportacion, texto] of justificaciones) {
      await qr.query(
        `INSERT INTO "equipo_justificaciones" ("codigo_importacion","texto") VALUES ($1,$2)`,
        [codigoImportacion, texto],
      );
    }
  }

  // Solo FUN-001 a FUN-004: FUN-005 llegó incompleto en el JSON de origen y
  // se deja para la migración de datos reales.
  private async seedPerfilesFuncion(qr: QueryRunner): Promise<void> {
    const funcionesComunes = [
      'Seguir los lineamientos del Plan de Acción en las Escuelas de Música y/o Agrupaciones Integradas.',
      'Atender los lineamientos conceptuales, metodológicos, pedagógicos, territoriales y administrativos que fundamenta la Alcaldía de Medellín - Secretaría de Cultura Ciudadana, la Universidad de Antioquia – Facultad de Artes y la Dirección General en diálogo con el equipo coordinador para la implementación y consolidación del programa Red de Escuelas de Música de Medellín.',
      'Implementar la clase colectiva, los laboratorios de exploración para la creación sonora y la investigación como estrategia metodológica desarrollada por la Red de Escuelas de Música de Medellín.',
      'Planear, diseñar, estructurar, implementar, hacer seguimiento, evaluar y entregar adecuadamente los contenidos en el formato correspondiente con base en el plan de formación de cada subárea, en los laboratorios de exploración para la creación sonora y en el proyecto de la EM asignada.',
      'Participar en la construcción, implementación y sistematización de los proyectos de escuelas de música y/o agrupaciones integradas y en los demás procesos investigativos del proyecto',
      'Asistir y participar en las reuniones programadas por los distintos estamentos de la Red y en las actividades de capacitación programadas desde las diferentes instancias.',
      'Participar activamente de los escenarios de cualificación dispuestos para fortalecer su quehacer pedagógico, humano y técnico, y diseñar estrategias para la implementación de dichos aprendizajes en los procesos de las escuelas a su cargo.',
      'Apoyar, proponer y diseñar en consenso con las gestiones y/o las direcciones correspondientes los repertorios y materiales pedagógicos para las poblaciones asignadas, adecuados al nivel técnico, al proyecto de las escuelas de música y/o agrupaciones integradas, a la investigación y a los laboratorios de exploración para la creación sonora.',
      'Acompañar a los participantes en sus procesos formativos de promoción de las escuelas de música y/o agrupaciones integradas u otras estrategias de la Red de Escuelas de Música de Medellín.',
      'Garantizar la estabilidad de los procesos formativos en términos de calidad desde la formación integral de los niños, niñas, adolescentes y jóvenes y en función de su cobertura.',
      'Realizar socialización de procesos a través de muestras a los familiares y acudientes de su población participante.',
      'Participar en el intercambio de experiencias formativas y socializarlas al interior del programa.',
      'Integrar los procesos formativos, pedagógicos, estético musicales y comunitarios a los contextos territoriales, a través de la observación participante y el seguimiento a la zona de influencia de las escuelas de música y/o agrupaciones integradas.',
      'Comunicar de forma prudente, oportuna de manera verbal y/o por escrito, cuando se identifique una situación de riesgo o vulneración de derechos de algún menor, a la Dirección de la Escuela donde se esté presentando dicha situación, para que se establezca la ruta adecuada de respuesta institucional, según lo dispuesto por la articulación de la Red de Escuelas de Música de Medellín al SATMED (Sistemas de Alertas Tempranas de Medellín).',
      'Asistir a reuniones, conciertos, presentaciones y otros eventos o actividades programadas para dar cumplimiento al objeto contractual.',
      'Reconocer y respetar los derechos morales de autor sobre los productos, obras, contenidos, desarrollos, metodologías, investigaciones y demás creaciones generadas durante la ejecución del contrato, así como ceder al proyecto Red de Músicas de Medellín de la Secretaría de Cultura Ciudadana los derechos patrimoniales y demás derechos de explotación económica que se deriven de dichos productos, para su uso, reproducción, comunicación pública, distribución, transformación, adaptación y cualquier otra forma de aprovechamiento permitida por la legislación vigente y por los instrumentos de propiedad intelectual aplicables.',
    ];

    const fun001 = [
      ...funcionesComunes,
      'Realizar con el apoyo de las gestiones pedagógicas, un espacio regular (físico o virtual) para sistematizar, socializar y transferir experiencias significativas de orden metodológico, didáctico y estéticos-musicales entre escuelas y/o agrupaciones',
      'Crear y fortalecer una estrategia con herramientas pedagógicas específicas, centradas en metodologías activas, laboratorios de creación y experimentación, repertorios y didácticas para las clases colectivas.',
      'Aportar a la consolidación del proceso de iniciación música en los espacios que se requiera',
      'socializa en espacios de formación alguna herramientas didácticas usadas en el proceso de incicion música.',
      'En proporción al tiempo asignado en este contrato, la intensidad horaria en ciertas funciones varía acorde a las necesidades del proyecto',
      'Reportar de forma prudente y por escrito, cuando identifique una situación de riesgo o vulneración de derechos de algún NNAJ, a la Dirección de la Escuela o a la gestión humana o jurídica directamente, en caso de considerarse pertinente, donde se esté presentando dicha situación, para que se establezca la ruta adecuada de respuesta institucional, según lo dispuesto por la articulación de la Red de Escuelas de Música de Medellín al SATMED (Sistemas de Alertas Tempranas de Medellín).',
    ];
    const fun002 = [
      ...funcionesComunes,
      'Realizar con el apoyo de las gestiones pedagógicas, un espacio regular (físico o virtual) para sistematizar, socializar y transferir experiencias significativas de orden metodológico, didáctico y estéticos-musicales entre escuelas y/o agrupaciones.',
      'Crear y fortalecer una estrategia con herramientas pedagógicas específicas, centradas en metodologías activas, laboratorios de creación y experimentación, repertorios y didácticas para las clases colectivas.',
      'Reportar de forma prudente y por escrito, cuando identifique una situación de riesgo o vulneración de derechos de algún NNAJ, a la Dirección de la Escuela o a la gestión humana o jurídica directamente, en caso de considerarse pertinente, donde se esté presentando dicha situación, para que se establezca la ruta adecuada de respuesta institucional, según lo dispuesto por la articulación de la Red de Escuelas de Música de Medellín al SATMED (Sistemas de Alertas Tempranas de Medellín).',
      'En proporción al tiempo asignado en este contrato, la intensidad horaria en ciertas funciones varía acorde a las necesidades del proyecto',
    ];
    const fun003 = [
      ...funcionesComunes,
      'Realizar con el apoyo de las gestiones pedagógicas, un espacio regular (físico o virtual) para sistematizar, socializar y transferir experiencias significativas de orden metodológico, didáctico y estéticos-musicales entre escuelas y/o agrupaciones.',
      'Reportar de forma prudente y por escrito, cuando identifique una situación de riesgo o vulneración de derechos de algún NNAJ, a la Dirección de la Escuela o a la gestión humana o jurídica directamente, en caso de considerarse pertinente, donde se esté presentando dicha situación, para que se establezca la ruta adecuada de respuesta institucional, según lo dispuesto por la articulación de la Red de Escuelas de Música de Medellín al SATMED (Sistemas de Alertas Tempranas de Medellín).',
      'En proporción al tiempo asignado en este contrato, la intensidad horaria en ciertas funciones varía acorde a las necesidades del proyecto',
    ];
    const fun004 = [...funcionesComunes];

    const perfiles: Array<[string, string, string[]]> = [
      ['FUN-001', 'ARTISTA FORMADOR', fun001],
      ['FUN-002', 'ARTISTA FORMADOR', fun002],
      ['FUN-003', 'ARTISTA FORMADOR', fun003],
      ['FUN-004', 'ARTISTA FORMADOR', fun004],
    ];
    for (const [codigoImportacion, cargoReferencia, items] of perfiles) {
      await qr.query(
        `INSERT INTO "equipo_perfiles_funciones" ("codigo_importacion","cargo_referencia","items") VALUES ($1,$2,$3)`,
        [codigoImportacion, cargoReferencia, JSON.stringify(items)],
      );
    }
  }
}
