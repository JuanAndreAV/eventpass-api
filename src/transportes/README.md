# Módulo de Transportes

Digitaliza el proceso semanal de transporte de las Agrupaciones Integradas de la Red de
Músicas de Medellín, que hoy se opera con un Formulario de Google, una hoja de cálculo con
fórmulas y el envío manual de PDF y Excel a la empresa transportadora.

El módulo cubre el ciclo completo: el participante solicita el servicio, la secretaría de su
escuela lo aprueba, el sistema asigna rutas y calcula puestos, vehículo y costo, y genera los
documentos que recibe la transportadora.

> **La fuente autoritativa de la lógica de negocio es la hoja de cálculo de la RMM**, no los
> PDF de solicitudes puntuales: esos son ejemplos de un evento concreto. Cada regla de este
> documento indica de qué celda o fórmula del libro salió.

---

## Índice

1. [Estado del desarrollo](#estado-del-desarrollo)
2. [Flujo operativo](#flujo-operativo)
3. [Reglas de negocio](#reglas-de-negocio)
4. [Modelo de datos](#modelo-de-datos)
5. [Arquitectura del backend](#arquitectura-del-backend)
6. [API](#api)
7. [Frontend](#frontend)
8. [Roles y permisos](#roles-y-permisos)
9. [Puesta en marcha](#puesta-en-marcha)
10. [Pruebas](#pruebas)
11. [Decisiones de diseño](#decisiones-de-diseño)
12. [Pendientes](#pendientes)

---

## Estado del desarrollo

| Fase | Alcance | Estado |
| --- | --- | --- |
| 1 | Catálogos configurables, convocatorias, formulario de solicitud, aprobación por secretaría | Terminada |
| 2 | Motor de cálculo (rutas, puestos, vehículo, costo) y exportación a PDF/Excel | Terminada |
| 3 | Registro de vehículo, conductor y guía; control de abordaje; novedades del servicio | Pendiente |
| 4 | Notificaciones por correo, informes de uso irregular | Pendiente |

---

## Flujo operativo

1. **El administrador abre una convocatoria** (`transporte_ciclos`) para un evento: fecha,
   destino, agrupaciones convocadas, hora de recogida y de regreso, y fecha límite de cierre
   (habitualmente el miércoles a las 10:00 a.m.). La convocatoria pasa a estado `ABIERTO`.
2. **El participante diligencia el formulario público** en `/transportes/solicitud`. Se
   identifica con su número de documento y debe existir previamente como estudiante registrado
   por su escuela. Indica agrupación, instrumento y qué trayectos necesita.
3. **La secretaría de la escuela aprueba o rechaza.** Solo ve las solicitudes de su propia
   escuela. Únicamente las aprobadas entran al cálculo.
4. **El sistema asigna rutas y calcula** puestos, tipo de vehículo y costo por ruta.
5. **El administrador revisa el cálculo** en la pantalla de la convocatoria y descarga los tres
   documentos para enviarlos a la transportadora.
6. El día del evento la transportadora registra abordajes *(Fase 3)*.

---

## Reglas de negocio

### Asignación de ruta

Cada trayecto se resuelve por separado, en este orden de prioridad:

1. **Si la agrupación tiene ruta propia, esa manda.** El Coro Inicial viaja siempre en la
   Ruta 11 sin importar de qué escuela venga (`transporte_agrupaciones.ruta_id`).
2. **Si no, la ruta de la escuela del trayecto**, según la tabla `transporte_escuela_ruta`.

La ruta de ida sale de la *escuela de salida* y la de regreso de la *escuela de llegada*, que
pueden ser distintas entre sí y distintas a la escuela a la que pertenece el estudiante. **Es un
caso normal, no una excepción.**

> Origen: `VLOOKUP` contra `'2. Protocolo de reporte'!$A$19:$C$54` en las columnas *Ruta ida* y
> *Ruta regreso* de la hoja `3. BD - para rutas`.

### Puestos necesarios

Los puestos no son iguales a la cantidad de personas: algunos instrumentos ocupan puestos
adicionales por su tamaño.

```
puestos de un trayecto = Σ (1 + puestos adicionales del instrumento + acompañante de cada pasajero)
puestos de la ruta     = max(puestos de ida, puestos de regreso)
```

Se toma el **máximo de los dos trayectos porque el mismo vehículo hace los dos recorridos**: debe
alcanzar para el más cargado. La tabla de puestos adicionales por instrumento es configurable.

Quien viaja con acompañante ocupa un puesto más. El acompañante **no es una fila aparte** en la
planilla: se anota junto al nombre de la persona para que la guía cuadre el conteo.

> Origen: `PUESTOS NECESARIOS` en las hojas de ruta:
> `COUNTA(F10:F1008) + COUNTIF(C:C,"Contrabajo")*2 + COUNTIF(C:C,"Tuba")*2 + COUNTIF(C:C,"Violonchelo")*1 + COUNTIF(C:C,"Trombón")*1 + COUNTIF(C:C,"Corno")*1 + COUNTIF(C:C,"Brítono / Eufonio")*1`
>
> El máximo entre trayectos **es una divergencia deliberada respecto del Excel**, que solo contaba
> la ida. Ver [Decisiones de diseño](#decisiones-de-diseño).

### Tipo de vehículo

Se elige por el rango en el que caen los puestos necesarios. Los rangos son configurables.

| Puestos | Vehículo |
| --- | --- |
| 1 – 4 | Camioneta |
| 5 – 15 | Micro |
| 16 – 25 | Buseta |
| 26 – 42 | Bus |

Si los puestos quedan fuera de todo rango, la ruta se marca como *cantidad fuera de rango* y se
emite una advertencia en vez de elegir un vehículo al azar.

> Origen: fórmula `TIPO DE TRANSPORTE` (celda `B6`) de las hojas de ruta.

### Costo

El costo de una ruta sale de cruzar su **zona** con el **tipo de vehículo** requerido contra la
tabla de tarifas vigente. Se toma la tarifa activa más reciente cuya fecha de vigencia sea
anterior o igual a la fecha del evento.

Tarifas vigentes (`'2. Protocolo de reporte'!A13:E15`, con los ajustes 2026 de la RMM):

| Zona | Bus | Buseta | Micro | Camioneta |
| --- | --- | --- | --- | --- |
| Urbana | 610.000 | 560.000 | 450.000 | 200.000 |
| Rural 1 | 890.000 | 790.000 | 690.000 | 200.000 |
| Rural 2 | 1.150.000 | 995.000 | 890.000 | 200.000 |

**Toda la tabla es editable** desde `/admin/transportes/catalogos`, porque las tarifas cambian
entre temporadas. Se puede corregir el valor y la fecha de vigencia de una tarifa existente, o
registrar una nueva vigencia y dejar la anterior como histórico.

### La camioneta se cobra por hora

No tiene tarifa plana: son **$50.000 por hora con un mínimo de 4 horas**. Como en la operación
real siempre se factura el mínimo, la tarifa se guarda ya resuelta en **$200.000** y no se modela
la hora como un dato aparte. Si algún día se contratan servicios más largos, el camino es agregar
las horas a la convocatoria y multiplicar aquí, no editar la tarifa a mano.

### Media tarifa cuando no hay regreso

Si en una ruta **ninguna solicitud aprobada pide regreso**, el vehículo hace un solo recorrido y se
cobra **la mitad de la tarifa**. Es automático: sale del cálculo, no de una marca manual. El
resultado expone `tarifaBase` (lo que costaría completo), `mediaTarifa` y el `valor` ya dividido,
y tanto la pantalla como el PDF y el Excel dicen por qué esa ruta cobra menos.

Las rutas marcadas como *solo ida* caen siempre en este caso, porque no admiten regreso.

**El total del servicio suma únicamente las rutas.** Los traslados adicionales fuera de las rutas
regulares se cotizan aparte, tal como `SUM(E31:E41)` en la hoja de costos.

### Ensamble Neuro

No genera ruta ni vehículo propio: sus integrantes viajan dentro de la ruta regular de su escuela,
pero se marcan de forma visualmente distinta y su punto de destino es la Escuela de Música Belén
Parque Biblioteca en lugar del destino general del evento.

Además **pueden viajar con un acompañante**, que ocupa un puesto más. Se modela con
`destino_especial`, `requiere_marca_distintiva` y `permite_acompanante` en la agrupación, no con
código especial: cualquier otra agrupación puede habilitar el acompañante desde el catálogo sin
tocar el código. El formulario solo muestra la casilla si la agrupación elegida lo permite, y el
backend rechaza el acompañante en las que no.

### Casi toda ruta hace ida y regreso

Por defecto una ruta hace los dos recorridos y lo que varía es qué trayectos pide cada estudiante:
puede solicitar solo ida, solo regreso, o ambos.

La excepción son las rutas marcadas **`solo_ida`** en el catálogo. Hoy es la **R11 — Belén Rincón /
Casa de la Música (Coro Inicial)**, que lleva al grupo pero no lo trae. Por una ruta de solo ida no
se puede pedir regreso: el formulario ni siquiera ofrece la casilla, y el backend la rechaza con un
mensaje que nombra la ruta. Si una ruta se marca como solo ida cuando ya tenía solicitudes con
regreso, el cálculo ignora ese trayecto y lo reporta en las advertencias en vez de inventar un
recorrido que no existe.

---

## Modelo de datos

Diez tablas nuevas con prefijo `transporte_`. **No se modificó ninguna tabla del módulo de control
de acceso por QR**, salvo el catálogo compartido de escuelas, al que se le completaron los nombres
y direcciones oficiales.

```
                    ┌──────────────────┐
                    │ transporte_zonas │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
   ┌──────────▼─────────┐      ┌────────────▼──────────┐      ┌──────────────────────────┐
   │  transporte_rutas  │      │  transporte_tarifas   │──────│ transporte_tipos_vehiculo│
   └──────────┬─────────┘      └───────────────────────┘      └──────────────────────────┘
              │                     zona × vehículo → valor
      ┌───────┴────────────────────┐
      │                            │
┌─────▼──────────────────┐  ┌──────▼─────────────────────┐
│ transporte_escuela_ruta│  │ transporte_agrupaciones    │
│  (escuela → ruta, 1:1) │  │  ruta_id = ruta propia     │
└─────┬──────────────────┘  └──────┬─────────────────────┘
      │                            │
      │ escuelas (compartida)      │ N:M
      │                     ┌──────▼──────────────────────┐
      │                     │ transporte_ciclos           │
      │                     │  (convocatoria de un evento)│
      │                     └──────┬──────────────────────┘
      │                            │
      │                     ┌──────▼──────────────────────┐
      └─────────────────────│ transporte_solicitudes      │
                            │  estudiante + trayectos     │
                            └─────────────────────────────┘
                                   │
                            estudiantes (compartida)
```

### Tablas

| Tabla | Contenido | Filas cargadas |
| --- | --- | --- |
| `transporte_zonas` | Urbana, Rural 1, Rural 2 | 3 |
| `transporte_tipos_vehiculo` | Nombre y rango de puestos | 4 |
| `transporte_tarifas` | Zona × vehículo → valor, con vigencia | 12 |
| `transporte_instrumentos` | Instrumento y puestos adicionales | 19 |
| `transporte_agrupaciones` | Agrupaciones, con ruta propia, destino especial y acompañante opcionales | 12 |
| `transporte_rutas` | Ruta, código, zona y marca de solo ida | 11 |
| `transporte_escuela_ruta` | Mapeo escuela → ruta (único por escuela) | 28 |
| `transporte_ciclos` | Convocatoria: evento, destino, horarios, cierre, estado | — |
| `transporte_ciclos_agrupaciones` | Agrupaciones convocadas (N:M) | — |
| `transporte_solicitudes` | Solicitud del estudiante y su estado de aprobación | — |

### Decisiones del modelo

- **`transporte_escuela_ruta` es una tabla puente, no una columna en `escuelas`.** El catálogo de
  escuelas lo comparte el módulo de control de acceso y no debe cargar con conceptos de transporte.
- **La convocatoria es propia (`transporte_ciclos`), no la tabla `eventos` existente.** Los campos
  que necesita (destino, horarios, fecha de cierre, agrupaciones convocadas) no encajan en el
  modelo de eventos del módulo QR.
- **La secretaría se vincula a su escuela reusando `escuelas.apoyo_administrativo_id`**, que
  semánticamente ya era ese rol. No se creó tabla nueva.
- **Los horarios viven en la convocatoria, no en la ruta**, y son texto libre porque en la
  operación real combinan varios ("7:30 A.M. RURAL Y 8:00 A.M. URBANA").

---

## Arquitectura del backend

`src/transportes/` — un módulo NestJS con cuatro controladores y seis servicios.

```
transportes.module.ts        Registro de entidades, controladores y servicios

catalogos.controller.ts   →  catalogos.service.ts    CRUD de zonas, vehículos, tarifas,
                                                     instrumentos y agrupaciones
rutas.controller.ts       →  rutas.service.ts        Rutas y mapeo escuela → ruta
ciclos.controller.ts      →  ciclos.service.ts       Convocatorias y cambios de estado
                          →  calculo.service.ts      Motor de cálculo
                          →  documentos.service.ts   Exportación a PDF y Excel
solicitudes.controller.ts →  solicitudes.service.ts  Alta, consulta y aprobación
```

### `calculo.service.ts` — el motor

Es el corazón del módulo. `calcular(cicloId)` devuelve un objeto `CalculoCiclo` con todo lo que
necesitan la pantalla y los documentos:

1. Carga las solicitudes **aprobadas** de la convocatoria.
2. Resuelve la ruta de ida y de regreso de cada una (agrupación primero, escuela después).
3. Registra a cada persona en el listado de **cada ruta que usa**. Quien va por una ruta y vuelve
   por otra aparece en ambos listados, con el trayecto correspondiente marcado.
4. Por ruta calcula puestos de ida y de regreso, y toma el máximo.
5. Elige vehículo por rango y tarifa por zona × vehículo.
6. Acumula totales y reporta `sinAsignar` (solicitudes cuya escuela no tiene ruta) y
   `advertencias` (puestos fuera de rango, tarifa faltante).

No escribe en la base: es un cálculo puro sobre el estado actual, así que puede consultarse
cuantas veces se quiera y siempre refleja las aprobaciones del momento.

### `documentos.service.ts` — exportación

Consume el resultado del motor y produce tres archivos:

| Documento | Equivale a | Contenido |
| --- | --- | --- |
| `costo.pdf` | Hoja *1. Costo del servicio* | Carta a la transportadora con la tabla de rutas, valores y totales |
| `rutas.pdf` | Hojas *Ruta 1* a *Ruta 11* | Una página por ruta con su planilla de pasajeros |
| `libro.xlsx` | El libro completo | Hoja de costo + una hoja por ruta |

Usa **pdfmake 0.2.x** y **exceljs**. Se descartó puppeteer para no arrastrar Chromium (~150 MB) al
despliegue de Firebase App Hosting. Se usa la fuente estándar Helvetica, que ya cubre los acentos
del español sin empaquetar archivos de fuente.

> **Cuidado con la versión de pdfmake.** La 0.3 es una reescritura con otra API y sin
> `createPdfKitDocument`. Además `@types/pdfmake` debe quedar pinneado en `0.2.13`: los tipos 0.3
> describen la API de navegador y el import por defecto no compila.

---

## API

Prefijo global: `/api/v1/eventpass`. Todos los endpoints cuelgan de `/transportes`.

### Catálogos

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/catalogos/escuelas` | Público |
| GET | `/catalogos/zonas` | Público |
| GET | `/catalogos/tipos-vehiculo` | Público |
| GET | `/catalogos/instrumentos` | Público |
| GET | `/catalogos/agrupaciones` | Público |
| GET | `/catalogos/tarifas` | Admin |
| POST/PATCH/DELETE | `/catalogos/{zonas\|tipos-vehiculo\|tarifas\|instrumentos\|agrupaciones}` | Admin |

Las lecturas son públicas porque el formulario de solicitud las necesita y el solicitante no tiene
cuenta. `/catalogos/escuelas` devuelve una lista reducida (solo id y nombre) para no abrir el
endpoint `/escuelas`, que sí exige sesión.

### Rutas

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/rutas` · `/rutas/:id` | Admin, Secretaria, Transportadora |
| GET | `/rutas/mapeo` | Admin |
| POST | `/rutas` | Admin |
| PATCH | `/rutas/:id` | Admin |
| PUT | `/rutas/:id/escuelas` | Admin |
| DELETE | `/rutas/:id` | Admin |

`PUT /rutas/:id/escuelas` reemplaza el conjunto completo de escuelas de la ruta. Como una escuela
pertenece a una sola ruta, asignarla aquí la desvincula de la que la tuviera antes.

### Convocatorias

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/ciclos/abiertos` | Público |
| GET | `/ciclos` · `/ciclos/:id` | Admin, Secretaria, Transportadora |
| GET | `/ciclos/:id/calculo` | Admin, Transportadora |
| GET | `/ciclos/:id/documentos/costo.pdf` | Admin, Transportadora |
| GET | `/ciclos/:id/documentos/rutas.pdf` | Admin, Transportadora |
| GET | `/ciclos/:id/documentos/libro.xlsx` | Admin, Transportadora |
| POST | `/ciclos` | Admin |
| PATCH | `/ciclos/:id` · `/ciclos/:id/estado` | Admin |
| DELETE | `/ciclos/:id` | Admin |

`/ciclos/abiertos` devuelve solo las convocatorias en estado `ABIERTO` cuya fecha de cierre no ha
pasado. Es lo que alimenta el formulario público.

### Solicitudes

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | `/solicitudes` | Público |
| GET | `/solicitudes/consulta?documento=` | Público |
| GET | `/solicitudes/ultima?documento=` | Público |
| PATCH | `/solicitudes/:id` | Público hasta el cierre; luego Admin y Secretaria |
| GET | `/solicitudes` · `/solicitudes/:id` | Admin, Secretaria |
| PATCH | `/solicitudes/:id/aprobar` · `/rechazar` | Admin, Secretaria |

`GET /solicitudes` filtra automáticamente por la escuela de la secretaría autenticada. El
administrador ve todo. Acepta `cicloId`, `escuelaId` y `estado` como filtros.

Validaciones al crear una solicitud: la convocatoria debe estar abierta y sin vencer, el documento
debe corresponder a un estudiante registrado, la agrupación debe estar convocada en ese ciclo,
debe pedirse al menos un trayecto, cada trayecto solicitado debe indicar su escuela, el acompañante
solo se acepta si la agrupación lo permite, no se puede pedir regreso por una ruta de solo ida, y
no puede existir otra solicitud del mismo estudiante en la misma convocatoria. Las mismas reglas se
revalidan al editar.

`GET /solicitudes/ultima?documento=` devuelve la última solicitud de esa persona. El formulario
público la usa para prellenarse: el solicitante no tiene cuenta, así que su "perfil" es lo que
diligenció la vez anterior.

### Quién puede editar una solicitud

`PATCH /solicitudes/:id` atiende dos casos por la misma ruta, resueltos con un guard de sesión
opcional (`JwtOpcionalGuard`):

| Quién | Cuándo | Qué pasa con el estado |
| --- | --- | --- |
| El estudiante, sin cuenta | Mientras la convocatoria siga abierta y no venza el cierre | Si ya estaba aprobada o rechazada, **vuelve a pendiente**: la secretaría revisó otros datos |
| Admin o secretaría | También después del cierre | El estado se respeta tal como esté |

La secretaría solo puede editar solicitudes de su propia escuela, igual que para aprobar.

---

## Frontend

Angular 22 con componentes standalone, signals y Tailwind. Repositorio `eventpass-front`.

### Pantallas

| Ruta | Componente | Acceso |
| --- | --- | --- |
| `/transportes/solicitud` | `solicitud-publica/` | Pública |
| `/admin/transportes/ciclos` | `ciclos/` | Admin |
| `/admin/transportes/ciclos/:id/calculo` | `calculo/` | Admin |
| `/admin/transportes/solicitudes` | `solicitudes/` | Admin, Secretaria |
| `/admin/transportes/rutas` | `rutas/` | Admin |
| `/admin/transportes/catalogos` | `catalogos/` | Admin |

### Servicios

`src/app/services/transportes/` — `catalogos.service.ts`, `ciclos.service.ts`,
`solicitudes.service.ts`. Los modelos están en `src/app/interfaces/transportes.ts`.

### Notas de implementación

- **El sidebar es sensible al rol.** Cada ítem declara qué roles lo ven y se filtra con
  `AuthService.hasRole`. Antes de este módulo mostraba todo a cualquier sesión.
- **Los documentos se descargan como blob**, no abriendo la URL, para que la cookie de sesión
  viaje igual en cualquier contexto sin depender de las reglas de SameSite.
- **`fecha-bogota.ts`** convierte entre `<input type="datetime-local">` e ISO con offset `-05:00`.
  Sin eso la hora viaja "naive" y Postgres, que corre en UTC, la interpreta cinco horas corrida.
- **El formulario público se prellena solo.** Al teclear el documento (con un debounce de 600 ms)
  consulta la última solicitud y rellena agrupación, instrumento, trayectos y teléfonos. La
  agrupación anterior se descarta si no está convocada en la convocatoria elegida.
- **Se edita desde la misma pantalla.** El listado "Consultar mis solicitudes" trae un botón
  *Editar* mientras la convocatoria no haya cerrado; la convocatoria y el documento quedan
  bloqueados porque cambiarlos sería otra solicitud. Después del cierre, la edición vive en
  `/admin/transportes/solicitudes`, en una fila desplegable bajo cada solicitud.

---

## Roles y permisos

| Rol | Código | Puede |
| --- | --- | --- |
| Solicitante | *(sin cuenta)* | Crear y consultar sus solicitudes identificándose con el documento |
| Secretaria de escuela | `SECRETARIA` | Ver y aprobar/rechazar solo las solicitudes de su escuela |
| Empresa de transporte | `TRANSPORTADORA` | Consultar rutas, convocatorias, cálculo y documentos |
| Administrador | `ADMIN` | Todo: catálogos, convocatorias, cálculo, documentos y solicitudes |

El **solicitante no tiene cuenta de usuario**: se identifica con su número de documento y debe
existir previamente en la tabla `estudiantes`, cargado por su escuela.

La **secretaría se vincula a su escuela** por `escuelas.apoyo_administrativo_id`. El filtrado se
aplica en `SolicitudesService.escuelasVisiblesPara()`, del lado del servidor.

---

## Puesta en marcha

Las cinco migraciones del módulo se aplican con el resto:

```bash
npm run migration:run
```

En Windows, el script `typeorm` de `package.json` usa sintaxis de shell POSIX y falla en
PowerShell. Ejecutar en su lugar:

```powershell
$env:NODE_OPTIONS = "--no-experimental-strip-types"
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts migration:run
```

| Migración | Qué hace |
| --- | --- |
| `1788100000000-CreateTransportesModule` | Crea las 10 tablas y los roles `SECRETARIA` y `TRANSPORTADORA` |
| `1788100000001-SeedDatosRealesTransportes` | Carga los catálogos oficiales 2026 y completa las 28 escuelas |
| `1788100000002-MoverHorariosAlCiclo` | Mueve hora de recogida y regreso de la ruta a la convocatoria |
| `1788100000003-QuitarTipoRecorridoDeRuta` | Elimina `tipo_recorrido`: toda ruta hace ida y regreso |
| `1788100000004-AjustesOperacion2026` | Escuela Santo Domingo Savio, `solo_ida` en rutas (R11), camioneta a $200.000, acompañante y las 7 agrupaciones que faltaban |

La segunda migración **completa las escuelas existentes en vez de duplicarlas**: actualiza por
`codigo` y conserva los estudiantes ya asociados.

Los catálogos quedan cargados y son editables desde `/admin/transportes/catalogos`. Lo único que
falta configurar a mano es la vinculación de cada secretaria con su escuela.

---

## Pruebas

Dos pruebas de integración que corren contra la base real. **Siembran sus datos, verifican y
limpian solas**; usan prefijos `TESTCALC` y `TESTDOC` en el documento del estudiante para no
mezclarse con datos reales.

```powershell
$env:NODE_OPTIONS = "--no-experimental-strip-types"

# Motor de cálculo — 36 aserciones
npx ts-node -r tsconfig-paths/register scripts/probar-calculo.ts

# Exportación de documentos — 20 aserciones
npx ts-node -r tsconfig-paths/register scripts/probar-documentos.ts ./salida
```

`probar-calculo.ts` cubre el recargo por instrumento, el puesto extra del acompañante, la
selección de vehículo por rango, la tarifa por zona, la ruta propia de la agrupación, los tres
casos de trayecto (solo ida, solo regreso, ida y regreso por rutas distintas), la regla del máximo,
la media tarifa de una ruta sin regreso y la advertencia cuando alguien pide regreso por una ruta
de solo ida. Incluye además un escenario de volumen que reproduce una fila del documento oficial:
23 participantes en la Ruta 1 → buseta → $560.000.

`probar-documentos.ts` genera los tres archivos, valida que sean íntegros y **vuelve a abrir el
Excel para comprobar celdas concretas**: empresa, destino, horarios, vehículo calculado, totales,
el marcado del Ensamble Neuro y la presencia de quienes solo piden regreso.

---

## Decisiones de diseño

### Puestos por el máximo de los dos trayectos

**Es la única divergencia deliberada respecto del Excel.** Las hojas de ruta del libro son tablas
dinámicas filtradas por el campo *Ruta ida* (verificado en el XML del `.xlsx`: los demás valores
quedan con `h="1"`), así que `PUESTOS NECESARIOS` cuenta solo el trayecto de ida.

Eso produce dos fallas cuando alguien no pide ambos trayectos:

- Quien pide **solo regreso** no aparece en ninguna planilla y no ocupa puesto contratado.
- Quien **regresa por otra ruta** solo figura en la planilla de la ida; la guía de la ruta de
  regreso no lo tiene en su lista.

Como el mismo vehículo hace los dos recorridos, el sistema dimensiona por el trayecto más cargado.
En un caso con 4 puestos de ida y 5 de regreso, la regla anterior contrataba una camioneta (rango
1–4) y dos personas quedaban sin puesto.

### Las rutas de un solo sentido volvieron, pero como dato

La migración `1788100000003` había eliminado `tipo_recorrido` de la ruta con el argumento de que
toda ruta hace ida y regreso. Era falso para la R11. Se reintrodujo como un booleano `solo_ida` y
no como el enum anterior: lo único que hace falta saber es si la ruta admite regreso, y un booleano
no deja estados intermedios que nadie sabe interpretar. El costo de esa ruta no lleva regla propia
—paga media tarifa por la regla general de "nadie pidió regreso"—, así que la marca solo gobierna
qué se le puede pedir, no cuánto cuesta.

### El total excluye los traslados adicionales

Se replica el comportamiento del Excel (`SUM(E31:E41)` suma solo las rutas). Los traslados
adicionales entre sedes se cotizan aparte.

### Correcciones sobre los datos de origen

- El instrumento figura como `Brítono / Eufonio` (sic) en el formulario, y el `COUNTIF` del Excel
  busca ese texto exacto: corregir la ortografía allá rompería el cálculo en silencio. Aquí quedó
  como **`Barítono / Eufonio`**, y al ser una llave foránea la fragilidad desaparece.
- El libro tiene **5 agrupaciones**, no las 4 del documento de requerimientos: aparece
  `Banda Sinfónica Juvenil`. La RMM confirmó después que son **12** en total, así que se cargaron
  las siete que faltaban (coros de familias y juvenil, ensamble y semillero de músicas populares,
  orquesta y semillero de tango, y la orquesta sinfónica juvenil).
- Eran **28 escuelas**, no 27. La RMM reportó después que faltaba **Santo Domingo Savio**, que se
  cargó sin ruta para que el administrador se la asigne: son **29**.

---

## Pendientes

### Fase 3 — Operación del servicio

- Entidad de empresa transportadora. Hoy su nombre es la constante `EMPRESA_TRANSPORTE` en
  `documentos.service.ts`; debe volverse configurable.
- Registro de placa, conductor y guía por ruta y fecha. Los documentos ya reservan esos campos en
  blanco.
- Control de abordaje de ida y regreso, incluyendo inasistencias no justificadas e ingresos no
  reportados.
- Novedades del servicio registradas por las guías.

### Fase 4 — Comunicación e informes

- Notificaciones por correo al aprobar o rechazar, y recordatorios antes del cierre. El módulo debe
  quedar desacoplado por canal para poder añadir WhatsApp después sin rediseñarlo.
- Informe de uso irregular por persona a lo largo del tiempo.

### Deuda conocida

- **Identificarse con el documento no es autenticarse.** Quien conozca el UUID de una solicitud
  puede editarla mientras la convocatoria siga abierta, y `GET /solicitudes/consulta?documento=` y
  `/ultima?documento=` exponen los datos de cualquiera cuyo número de documento se conozca. El
  prellenado del formulario amplía esa superficie: con solo teclear un documento ajeno se ven su
  agrupación, sus escuelas y sus teléfonos. Todo es consecuencia de que el solicitante no tenga
  cuenta, y conviene resolverlo (un código de acceso enviado por correo, por ejemplo) frente al
  requisito de protección de datos de menores (Ley 1581 de 2012) antes de salir a producción.
- Los traslados adicionales todavía no se pueden capturar desde la interfaz; el motor los
  contempla como concepto pero no hay pantalla para agregarlos al costeo.
