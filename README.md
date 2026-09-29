# EventPass API (Backend)

API REST de **EventPass**, la plataforma de la **Red de Músicas de Medellín (RMM)** para control de acceso a eventos (QR / NFC / cédula) y gestión de transporte de agrupaciones.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | NestJS 11 (TypeScript) |
| ORM / BD | TypeORM + PostgreSQL (Supabase en la nube; Docker Postgres 16 opcional en local) |
| Auth | JWT en cookie HttpOnly (`jwt`), Passport, bcrypt |
| Validación | `class-validator` + `ValidationPipe` global |
| Documentos | `pdfmake` 0.2.x (PDF) y `exceljs` (Excel) |
| QR | `qrcode` |
| Despliegue | Firebase App Hosting (Cloud Run) — `apphosting.yaml` |

Prefijo global: `/api/v1/eventpass`. CORS permite `localhost:4200`, `eventos-redmus.web.app` y `scanner-redmus.web.app` (con credenciales).

## Arquitectura

Monolito modular NestJS: un módulo por dominio, cada uno con `controller → service → entity/dto`. El esquema **no** se sincroniza automáticamente (`synchronize: false`): todo cambio va por **migraciones** en `src/migrations/`.

```
src/
├── auth/               Login/logout/perfil, JwtAuthGuard, RolesGuard, decorador @Roles
├── usuarios/  rol/     Cuentas del personal y roles (M:N)
├── escuelas/           Escuelas de la Red (director, apoyo administrativo, formadores)
├── estudiantes/        Estudiantes (foto, NFC UID, QR maestro, escuela)
├── eventos/            Eventos (tipo, aforo, fecha, escuela opcional)
├── asistentes/         Inscritos a un evento + token QR + ingreso
├── acceso-log/         Bitácora de lecturas de acceso (QR, cédula PDF417, NFC, manual)
├── validacion-identidad/ Registro de validaciones de identidad de estudiantes
├── transportes/        Módulo de transporte (ver abajo y transportes/README.md)
├── common/             Entidad base de persona (documento, nombres, contacto)
├── migrations/         Historial del esquema + seeds de datos reales
└── data-source.ts      Configuración para el CLI de TypeORM
```

## Base de datos

**Núcleo (control de acceso)**

```
roles ⇄ usuarios ── escuelas (director, apoyo_administrativo, formadores M:N)
                        │
usuarios 1─1 estudiantes ─N─1 escuelas
eventos ─N─1 escuelas (opcional)
eventos 1─N asistentes ─N─1 estudiantes (opcional)
accesos_log ─→ evento (obligatorio), asistente / estudiante / operador (opcionales)
validaciones_identidad ─→ estudiante, operador
```

Enums: `TipoDocumento` (CC, TI, CE, RC, PASAPORTE), `TipoEvento`, `TipoAsistente` (ESTUDIANTE, RED, EXTERNO), `MetodoLectura` (QR, CEDULA_PDF417, NFC, MANUAL), `MetodoIdentificacion` (NFC, QR, DOCUMENTO).

**Transportes** (prefijo `transporte_`)

```
zonas 1─N rutas          zonas × tipos_vehiculo ─→ tarifas (valor, vigente_desde)
rutas ⇄ escuelas         (tabla puente transporte_escuela_ruta)
agrupaciones ─→ ruta (opcional, gana sobre la de la escuela)
ciclos (convocatorias) ⇄ agrupaciones convocadas
ciclos 1─N solicitudes ─→ estudiante, escuela, agrupación, instrumento, ruta ida / ruta regreso
instrumentos (puestos adicionales por instrumento)
```

Los catálogos (zonas, tarifas, vehículos, instrumentos, rutas, escuelas→ruta) vienen precargados desde el Google Sheet oficial de la RMM (migración `1788100000001-SeedDatosRealesTransportes`).

## Módulos funcionales

### 1. Control de acceso a eventos
- CRUD de eventos, escuelas, estudiantes, asistentes.
- Inscripción de asistentes con **token QR** único; verificación por documento.
- **Ingreso** (`POST /asistentes/ingreso`) y bitácora en `accesos_log`.
- Identificación de estudiante por NFC / QR / documento (`POST /estudiantes/identificar`).
- Diseñado para operación **offline-first** desde el front (el escáner sincroniza lotes de ingresos pendientes).

### 2. Transportes
Digitaliza el proceso semanal (antes Google Forms + Excel):

1. **ADMIN** abre una *convocatoria* (ciclo): fecha, destino, agrupaciones, horas, cierre.
2. El **participante** (sin cuenta; se identifica por documento) llena el formulario público.
3. La **SECRETARIA** de su escuela aprueba o rechaza (solo ve su escuela).
4. **Motor de cálculo** (`CalculoService`): agrupa solicitudes aprobadas por ruta → puestos (máx. de ida/regreso + recargo por instrumento) → tipo de vehículo por rango → costo por zona × vehículo.
5. Exporta **PDF de costo, PDF de rutas y libro Excel** para la transportadora.

Reglas clave: toda ruta hace ida y regreso con el mismo vehículo; el TOTAL excluye traslados adicionales; todo lo numérico (tarifas, rangos, recargos) es configurable por catálogo. **La fuente autoritativa de la lógica es el Excel de la RMM.**

Fases: 1 catálogos + solicitud + aprobación ✅ · 2 cálculo + exportación ✅ · 3 vehículo/conductor/guía, control de abordaje, novedades ⏳ · 4 notificaciones por correo (WhatsApp después) ⏳.

## Autenticación y roles

Login → JWT firmado en cookie HttpOnly. Guards: `JwtAuthGuard` + `RolesGuard` con `@Roles(...)`.

| Rol | Alcance |
| --- | --- |
| `ADMIN` | Todo, incluido configuración de transportes |
| `SECRETARIA` | Aprueba/rechaza solicitudes de **su** escuela (`escuelas.apoyo_administrativo_id`) |
| `TRANSPORTADORA` | Consulta ciclos, rutas, cálculo y descarga documentos |
| `formador` / director / apoyo | Módulo de eventos y escuelas |

Endpoints públicos: login, eventos activos, inscripción, formulario y consulta de solicitud de transporte, ciclos abiertos.

> ⚠️ Varios controladores de `usuarios`, `roles` y `estudiantes` tienen los guards comentados como `TODO`; deben activarse antes de producción.

## Endpoints principales

| Recurso | Base |
| --- | --- |
| Auth | `/auth` (`login`, `logout`, `profile`) |
| Usuarios / Roles / Escuelas / Estudiantes / Eventos | `/usuarios`, `/roles`, `/escuelas`, `/estudiantes`, `/eventos` |
| Asistentes / Accesos | `/asistentes`, `/accesos-log`, `/validacion-identidad` |
| Transportes | `/transportes/{catalogos,rutas,ciclos,solicitudes}` |
| Documentos | `/transportes/ciclos/:id/documentos/{costo.pdf,rutas.pdf,libro.xlsx}` |

## Puesta en marcha

Requisitos: Node 20+, acceso a una BD PostgreSQL.

```bash
npm install
cp .env.example .env      # completar DB_*, JWT_SECRET, PORT
npm run migration:run     # aplica migraciones y seeds
npm run start:dev         # http://localhost:3000/api/v1/eventpass (PORT por defecto: 8080)
```

Variables: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`, `JWT_SECRET` (obligatoria, el arranque falla sin ella), `PORT`, `TZ=UTC`.

Notas:
- **Supabase**: si tu red no tiene IPv6, usa el *Transaction pooler* (puerto 6543, usuario `postgres.<project-ref>`), no la conexión directa.
- **Windows**: `npm run typeorm` usa sintaxis bash; en PowerShell define `$env:NODE_OPTIONS="--no-experimental-strip-types"` y ejecuta `npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts migration:run`.
- BD local opcional: `docker-compose.yaml` (Postgres 16).

## Pruebas

```bash
npm test                                    # unitarias (Jest)
npx ts-node -r tsconfig-paths/register scripts/probar-calculo.ts      # motor de cálculo (integración, se limpia sola)
npx ts-node -r tsconfig-paths/register scripts/probar-documentos.ts <carpeta>   # exportación PDF/Excel
```

Más detalle del módulo de transporte (reglas, modelo, decisiones): [src/transportes/README.md](src/transportes/README.md).
