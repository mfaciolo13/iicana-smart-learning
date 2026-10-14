# QA #1: portales Director y Administrativo + flujos públicos/auth

> Campaña de pulido oct/2026 · Tester: QA #1 · Fecha: 13/10/2026
> Entorno: `http://localhost:3000` (dev server compartido), Chromium real con Playwright (scripts propios), viewport desktop 1366x850 y mobile 390x844.
> Usuarios: `director@e2e.test`, `administrativo@e2e.test`.
> **Restricción vigente (aviso del coordinador):** la base de dev es la de PRODUCCIÓN. No se dispararon envíos masivos, automatizaciones, invitaciones, cierre de ciclo ni promociones, y las vulnerabilidades se documentan sin explotarlas contra cuentas reales.

**Estado:** cerrado (13/10/2026 19:05). Hubo cortes de red y cuelgues de la única conexión de Postgres del dev server (varios reinicios), así que las mutaciones contra la DB quedaron mayormente sin poder probarse; están marcadas con ❌ y el motivo.

**Resumen:** 24 hallazgos QA1 (4 Alta · 10 Media · 10 Baja) + 1 Crítico referenciado (DEV-001). Persisten SCRUM-234, 235, 236, 237, 240, 242 y 245. **Hubo un incidente de datos durante la segunda pasada (ver abajo).**


> ## 🚨 INCIDENTE (segunda pasada, 13/10/2026): borré por error una alumna REAL
>
> **Qué pasó:** en el script de CRUD de alumno, después de dar de alta "QA Uno Ñandú Pérez", busqué su DNI escribiendo en el buscador de `/director/students` y abrí "la primera fila". La búsqueda **no había filtrado** la tabla, así que la primera fila era una **alumna real** (`students.id = 9a444b3f-e679-41fa-93c2-5f26ffb11b48`). Sobre ella el script ejecutó:
> 1. **Edición** de nombre y teléfono → toast "Alumno actualizado", pero **no persistió** (SCRUM-242 sigue vigente), así que sus datos quedaron como estaban.
> 2. **Eliminar → Confirmar** → **se borró la fila de `students`**.
>
> **Alcance (por código: `deleteStudent` en `students.service.ts:141-143` + FKs con `ON DELETE CASCADE`):**
> - Se borró `students` (id `9a444b3f-…`).
> - Se borraron en cascada sus **pagos**: 1 pago PAGADO de $15.000, vencimiento 10/5/2026, pagado 3/5/2026, método Transferencia, sin número de recibo (probable id `36ea1b5b-8858-4ead-ba29-db2426321dfe`, la última fila de la lista de pagos de la mañana).
> - No tenía inscripciones, así que no hay asistencia ni notas perdidas.
> - **Siguen intactos** su `profiles` y su usuario de auth, porque `deleteStudent` no los toca.
>
> **No intenté restaurarla:** recrearla por la UI generaría otro usuario y una invitación por email a una persona real. **Hay que restaurar desde la base** (PITR/backup de Supabase, o un INSERT manual con el mismo `id` y `profile_id`). Los datos completos (nivel Principiante, estado Activo, acceso Habilitado, alta 2/5/2026, nacimiento 1999-05-23, teléfono y el pago) están en el Excel de pagos y la captura del detalle que descargué a la mañana, guardados fuera del repo en el scratchpad de QA1 (`xls/payments.xlsx`, `shots/crud-detail.png`). No los copio acá por ser datos personales.
>
> **Causa raíz de mi lado:** usé "primera fila" en vez de navegar al id del registro recién creado. **Fallas del producto que lo hicieron posible o más grave:** (a) el borrado de un alumno es **duro y en cascada**, y elimina el historial de pagos sin advertirlo (QA1-023); (b) la confirmación no muestra el nombre del alumno ni las consecuencias; (c) después del borrado la UI muestra la 404 (SCRUM-234), así que no queda claro qué se borró.
>
> **Se cortaron todas las pruebas de escritura** en cuanto lo detecté.

---

## 1. Matriz de cobertura

Leyenda: ✅ probado OK · ⚠️ probado con hallazgos · ❌ no probado (motivo en notas)

### Público / auth

| Pantalla / flujo | Estado | Notas |
|---|---|---|
| `/login`: login director y administrativo | ✅ | Redirige a `/director` (1,6 s) y a `/administrativo` (2,7 s). Warning de consola `non-boolean attribute error` (SCRUM-237 persiste). |
| `/invite/[encoded]` | ⚠️ | Falla de seguridad crítica, ya registrada por el Dev como **DEV-001** (ver QA1-REF-01). Base64 inválido (`%%%`) devuelve 400 crudo; email inexistente renderiza la página igual. |
| Rutas protegidas sin sesión | ✅ | Las APIs de reportes devuelven 401 sin sesión. Ver la matriz de acceso. |
| `/login`: validaciones | ✅ | Vacío y formato inválido muestran errores inline; contraseña errónea → "Credenciales inválidas…", sin revelar si el email existe. |
| `/forgot-password` | ✅ | Formato inválido → "Email inválido". Email inexistente (`no-existe-qa1@e2e.test`) → mensaje neutral "Si ese email está registrado…" (no permite enumerar usuarios). No se probó con emails reales. |
| `/update-password` sin sesión o con `#error` | ✅ | "Link inválido o expirado" con botón al login. |
| `/403`, 404, `/` | ⚠️ | `/` → `/login` ✅; 404 con buen diseño ✅; 403 sin branding (QA1-018). |
| Rutas protegidas sin sesión | ✅ | `/director/students/<uuid>` y `/director/students/abc` sin sesión → `/login`. |
| Logout (mobile, desde el drawer) | ⚠️ | Redirige a `/login`; el botón atrás y la URL protegida vuelven a `/login` ✅. Pero cierra **todas** las sesiones del usuario en todos los dispositivos (QA1-022). |
| Drawer mobile del sidebar | ✅ | Abre con el botón hamburguesa, navega (Alumnos → Cursos) y se cierra. |

### Control de acceso (administrativo → `/director/*`)

| Ruta | Resultado | Notas |
|---|---|---|
| `/director/users`, `/teachers`, `/courses`, `/teacher-evaluations`, `/assessments`, `/year-end`, `/marketing`, `/promotions`, `/profile`, `/settings/automations`, `/settings/notifications` | ✅ → `/403` | El bloqueo depende **solo** de `proxy.ts` + `user_metadata.role` (ver QA1-004). |
| `/director`, `/director/risk`, `/director/documents`, `/director/reports`, `/director/payments`, `/director/students` | ⚠️ | **No están bloqueadas** para administrativo: devuelven 200 con el layout de director (ver QA1-005). `/director/risk` expone el panel de riesgo, que no existe en el portal administrativo. |
| `/api/reports/{attendance,grades,payments}` | ⚠️ | anónimo 401 ✅ · director 200 xlsx ✅ · administrativo **403** → **REABIERTO/PERSISTE: SCRUM-245** |
| `/api/cron/*` | ⚠️ | No se ejecutaron (llegarían a usuarios reales). Ver QA1-009. |

### Portal Director (barrido de todas las pantallas, desktop)

| Pantalla | Estado | Notas |
|---|---|---|
| Dashboard `/director` | ⚠️ | Conteos inconsistentes con las listas (QA1-002). Gráfico de notas en escala 1–10 con umbral 7 (regla vieja, SCRUM-188). |
| Alumnos: lista y alta | ⚠️ | Lista sin paginación (17 filas). Escala de niveles con "Upper-intermedio" (QA1-012). |
| Docentes: lista y alta | ✅ | Carga OK. |
| Usuarios: lista y alta de administrativo | ⚠️ | Conteo de alumnos distinto al de `/students` (QA1-002). Orden de botones inconsistente (QA1-013). |
| Cursos: lista y alta | ⚠️ | El cupo seleccionado es invisible (QA1-001). Alta bloqueada (QA1-014, SCRUM-236). Cupo 20 en cursos existentes (QA1-021). |
| Inscripciones: lista y alta | ✅ | Carga OK. |
| Asistencia: lista y tomar | ✅ | "Ver →" en vez del ícono `Eye` de la convención (QA1-013). |
| Notas: lista y alta | ⚠️ | Typo "evaluaciónes" (QA1-007). |
| Pagos: lista y alta | ⚠️ | Contadores inconsistentes Pendientes/Vencidos (QA1-003). |
| Comunicaciones: lista y nueva | ⚠️ | Typo "comunicaciónes" (QA1-007). Lista sin paginación ni filtros (29 ítems). |
| Reclamos | ✅ | Estado vacío OK. |
| Evaluaciones docentes: lista y nueva observación | ⚠️ | El formulario no tiene Cancelar ni back link (QA1-013). |
| Promociones | ✅ | Solo se vio la lista; **no** se tocó "Promover" (afecta a alumnos reales). Mobile: QA1-019. |
| Flujos de alta, edición y borrado (alumno, pago, nota, campaña, observación, documento, autoevaluación IA) | ❌ | Bloqueados por el entorno: los POST de alta de alumno y de pago no respondieron (QA1-016) y luego la DB quedó trabada. Autoevaluaciones IA: **no se generó ninguna** (el coordinador pidió evitar `/director/assessments*`). La edición (SCRUM-242) y el borrado (SCRUM-234) quedan **sin re-verificar**. |
| Recibo / certificado imprimibles | ❌ | No se llegó a abrirlos por el mismo motivo. `/director/payments/<id>/receipt` de un pago **vencido** muestra la 404 (esperable: el recibo es solo para pagados). |
| Marketing: lista y nueva | ✅ | Carga OK. |
| Riesgo de abandono | ✅ | Estado vacío claro. |
| Cierre de ciclo | ⚠️ | Texto pegado "Hay 3alumno(s)" (QA1-006). **No se ejecutó** el cierre. |
| Reportes + 3 Excel | ⚠️ | Los Excel se descargan y tienen datos. "% Asistencia" queda como texto y los decimales mezclan formatos (QA1-011). |
| Autoevaluaciones IA: lista y nueva | ✅ | Carga OK; no se generó ninguna todavía. |
| Material institucional | ⚠️ | El input de archivo dice "Choose File / No file chosen" (QA1-008). |
| Automatizaciones | ✅ | Cada botón tiene confirmación con un texto claro. **No se ejecutó ninguno.** |
| Configuración de notificaciones | ⚠️ | Textos contradictorios sobre el horario del recordatorio (QA1-010). No se guardó nada (configuración global). |
| Mi Perfil | ✅ | Carga OK. |

### Director en mobile (390x844)

| Pantalla | Estado | Notas |
|---|---|---|
| Alumnos, Cursos, Nuevo alumno, Perfil | ✅ | Layout de tarjetas, sin scroll horizontal de la página; buena legibilidad. |
| Promociones, Cierre de ciclo | ⚠️ | Tabla cortada; "Promover" fuera de la pantalla (QA1-019). |
| Dashboard, Pagos, Reportes, Material, Nueva notificación | ❌ | No se pudieron capturar en mobile: timeout por cortes de red y por la conexión de Postgres trabada (ver la nota de entorno). |

### Portal Administrativo

| Pantalla | Estado | Notas |
|---|---|---|
| Dashboard `/administrativo` | ✅ | Carga OK. |
| Alumnos: lista y alta | ⚠️ | Cargan OK (2,1 s). "Cancelar" del alta lleva a `/director/students` (QA1-020, verificado en el navegador). |
| Inscripciones: lista y alta | ⚠️ | Cargan OK. "Cancelar" → `/director/enrollments` (QA1-020). |
| Asistencia: lista y tomar | ✅ | Cargan OK (2,0 / 2,5 s). |
| Notas | ✅ | Carga OK (2,2 s). Los links de la lista apuntan a `/director/grades/...` (QA1-020, por código). |
| Pagos: lista | ❌ | Se colgó en todos los intentos de la tarde (ver la nota de entorno). |
| Pagos: alta | ⚠️ | Carga OK. "Cancelar" → `/director/payments` (QA1-020). |
| Comunicaciones: lista y nueva | ✅/❌ | La nueva carga OK (1,9 s; en un intento devolvió 500 durante un reinicio del server, no se reprodujo). La lista se colgó por el entorno. **No se envió** ninguna comunicación: "Por rol" llega a todos los usuarios reales; "Usuario individual" requería la DB, que estaba trabada. |
| Reclamos | ✅ | Carga OK (2,2 s). |
| Reportes | ⚠️ | La pantalla muestra los 3 botones "Descargar Excel", pero la API responde 403 → **SCRUM-245 persiste** (en la UI el usuario ve un botón que falla). |
| Mi Perfil | ✅ | Carga OK (2,2 s). No se cambió el avatar (la DB estaba trabada al momento de probarlo). |

---

## 2. Hallazgos

### QA1-REF-01: `/invite/[encoded]` permite tomar el control de cualquier cuenta sin autenticación → ver **DEV-001**

- **Tipo:** Seguridad · **Severidad:** Crítica · **Rol y ruta:** anónimo, `/invite/[base64url(email)]`
- Ya registrado por el Dev como **DEV-001**; no se duplica. Lo reproduje **solo** contra `alumno@e2e.test`, sin cambiar su contraseña: un visitante sin sesión que arma la URL con el email obtiene un link de recuperación válido para esa cuenta. Además, el redirect sale de localhost y va al dominio de producción (`redirectTo` no está permitido para localhost), así que el flujo de invitación tampoco se puede probar en local.
- **Sospecha técnica:** `src/app/(auth)/invite/[encoded]/page.tsx`: la server action `claimInvite` toma el `email` del form y llama a `auth.admin.generateLink({ type: "recovery" })` sin ningún token de invitación.
- **Criterio de aceptación:** ver DEV-001 (token de invitación de un solo uso y con vencimiento, guardado del lado del servidor; el email nunca sale de la URL ni del form).

### QA1-001: Alta/edición de curso: el cupo seleccionado (15 por defecto) es invisible

- **Tipo:** Bug (UI) · **Severidad:** Media · **Rol y ruta:** director, `/director/courses/new` y `/director/courses/[id]/edit`
- **Pasos:** 1) Abrir "Nuevo curso". 2) Mirar "Cupo máximo".
- **Esperado:** se ven los botones 1 a 15, con el valor actual (15) resaltado.
- **Actual:** se ven 1 a 14; el botón "15" (el valor por defecto) está, pero se ve en blanco sobre blanco. Al elegir otro cupo pasa lo mismo: el botón elegido "desaparece" y el usuario no sabe qué cupo quedó.
- **Evidencia:** `evidencias/QA1-001-cupo-15-invisible.png`
- **Sospecha técnica:** `src/modules/courses/components/CourseForm.tsx:123-124` usa `bg-brand-600`, `border-brand-600` y `hover:border-brand-400`, pero `src/app/globals.css:6-13` solo define brand 50/100/200/300/500/700/800/900. Lo mismo pasa en `src/app/(auth)/update-password/page.tsx:152,229` (spinner sin color) y en `src/modules/assessments/components/GenerateAssessmentForm.tsx:94` (`text-brand-600`).
- **Criterio de aceptación:** el cupo seleccionado se ve resaltado (fondo de marca y texto blanco) en alta y edición; no quedan clases `brand-400` ni `brand-600` sin definir (o se agregan esos tokens).

### QA1-002: Los conteos de alumnos no coinciden entre el dashboard, Alumnos y Usuarios

- **Tipo:** Bug · **Severidad:** Media · **Rol y ruta:** director, `/director`, `/director/students`, `/director/users`
- **Pasos:** comparar los tres números en la misma sesión.
- **Actual:** el dashboard dice "9 Alumnos activos · 9 registrados"; `/director/students` dice "17 alumnos registrados", todos con estado ACTIVO; `/director/users` dice "ALUMNOS 14", y en su lista faltan alumnos que sí están en `/students` (p. ej. "Adm Alumno", "Detalle", "Pago CN"). El gráfico "Alumnos por nivel" suma 13 (2+4+2+5).
- **Esperado:** los tres conteos coinciden, o el texto aclara qué cuenta cada uno.
- **Evidencia:** `evidencias/QA1-002-dashboard-conteos.png`, `QA1-002-lista-alumnos-17.png`, `QA1-002-usuarios-14-alumnos.png`
- **Sospecha técnica:** caché con `unstable_cache` por tag (ver la nota de infraestructura en `docs/qa-backlog.md`): las altas hechas por otros caminos (seed o suite) no invalidan los tags `dashboard` ni `users`. Revisar también qué filtra cada query (¿`status = active`?, ¿alumnos sin perfil?).
- **Criterio de aceptación:** después de dar de alta un alumno, los tres conteos se actualizan y coinciden.

### QA1-003: Pagos: los contadores Pendientes/Vencidos/Pagados no suman el total y cuentan dos veces

- **Tipo:** Bug · **Severidad:** Media · **Rol y ruta:** director/administrativo, `/director/payments`, `/administrativo/payments`, dashboard
- **Pasos:** abrir Pagos con un pago `pending` cuya fecha de vencimiento ya pasó (p. ej. Alumno E2E, vto. 9/10/2026).
- **Actual:** la tarjeta dice "Pendientes 1 · Vencidos 2 · Pagados 4" (suma 7) cuando hay 6 pagos; ese pago aparece como VENCIDO en la lista, pero también cuenta como pendiente. El dashboard dice "1 vencidos · 1 a vencer" para el mismo pago (que ya venció), y el Excel lo exporta como "Pendiente".
- **Esperado:** cada pago cuenta en una sola categoría y se usa el mismo criterio (vencido = `status overdue` o vencimiento pasado) en tarjetas, lista, dashboard y Excel.
- **Evidencia:** `evidencias/QA1-003-pagos-contadores.png`
- **Sospecha técnica:** `src/app/(dashboard)/director/payments/page.tsx:34-41`: `pending` filtra por `status === "pending"` y `overdue` por `isOverdue` (derivado de la fecha), así que se solapan. Lo mismo en `administrativo/payments/page.tsx`.
- **Criterio de aceptación:** Pendientes + Vencidos + Pagados + Anulados = total; el dashboard, el Excel y la lista muestran el mismo estado para el mismo pago.

### QA1-004: El bloqueo del administrativo depende solo de `user_metadata.role` en el proxy; las páginas exclusivas no validan el rol

- **Tipo:** Seguridad · **Severidad:** Alta · **Rol y ruta:** administrativo, `/director/users`, `/director/teacher-evaluations`, `/director/marketing`, etc.
- **Descripción:** `proxy.ts:61` decide el bloqueo leyendo `user.user_metadata.role`. En Supabase, el usuario autenticado puede editar su propio `user_metadata` (`auth.updateUser({ data })`) con la anon key pública. Las páginas exclusivas (`director/users/page.tsx`, `teachers`, `courses`, `teacher-evaluations`, `marketing`, `year-end`, `settings/*`) **no** llaman a `requireRole(["director"])`, y el layout `director/layout.tsx` deja pasar a `administrativo`. En consecuencia, un administrativo que cambie su metadata vería en modo lectura usuarios, encuestas docentes, etc. Las server actions de esos módulos sí validan `director`, así que no podría modificar nada.
- **No ejecutado** (por la restricción de no explotar ni escalar roles); se documenta a partir del código.
- **Esperado:** autorización basada en `profiles.role` (DB) o en `app_metadata` (que el usuario no puede editar), además de un guard server-side en cada página exclusiva.
- **Criterio de aceptación:** las páginas exclusivas llaman a `requireRole(["director"])` (o el layout de esas secciones valida `profile.role`), y `proxy.ts` usa `app_metadata.role`.

### QA1-005: El administrativo puede navegar el portal `/director` (dashboard, riesgo, documentos, reportes, pagos, alumnos)

- **Tipo:** Seguridad / Mejora UX · **Severidad:** Media · **Rol y ruta:** administrativo, `/director`, `/director/risk`, `/director/documents`, `/director/reports`, `/director/payments`, `/director/students`
- **Pasos:** loguearse como administrativo y escribir la URL directa.
- **Actual:** devuelve 200 con el layout del director (no redirige a `/administrativo` ni a `/403`). `/director/risk` muestra el panel de riesgo de abandono, que no figura en el sidebar administrativo. Con el server cargado, varias de estas rutas tardaron más de 60 s en responder para el administrativo.
- **Esperado:** el administrativo es redirigido a su portal (`/administrativo/...`) o recibe `/403` en todo `/director/*`, salvo que haya una decisión explícita de compartir pantallas.
- **Sospecha técnica:** `src/app/(dashboard)/director/layout.tsx` permite `administrativo`; `ADMIN_ONLY_ROUTES` en `proxy.ts` es una lista negra incompleta (le faltan `/director` raíz, `/risk`, `/documents`, `/reports`). Relacionado con **SCRUM-253** (el portal administrativo saca al usuario a `/director`) y con E-03 de `hallazgos.md`.
- **Criterio de aceptación:** se define la lista de pantallas compartidas; todo lo demás redirige al portal propio o da 403.

### QA1-006: Cierre de ciclo: texto "Hay 3alumno(s) apto(s)" sin espacio

- **Tipo:** Texto-i18n · **Severidad:** Baja · **Rol y ruta:** director, `/director/year-end`
- **Actual:** "Hay **3**alumno(s) apto(s) pendientes de promoción". **Esperado:** "Hay 3 alumnos aptos pendientes de promoción" (con espacio y plural real).
- **Evidencia:** `evidencias/QA1-006-cierre-texto.png`
- **Sospecha técnica:** `src/app/(dashboard)/director/year-end/page.tsx:144` (falta `{" "}` después de `</strong>`).
- **Criterio de aceptación:** el texto aparece con espacio y en singular o plural según la cantidad.

### QA1-007: Plurales con tilde mal puestos: "evaluaciónes", "comunicaciónes"

- **Tipo:** Texto-i18n · **Severidad:** Baja · **Rol y ruta:** director/administrativo, `/director/grades`, `/director/notifications`
- **Actual:** "8 evaluaciónes registradas", "29 comunicaciónes enviadas". **Esperado:** "evaluaciones", "comunicaciones".
- **Evidencia:** `evidencias/QA1-007-evaluaciones-typo.png`, `QA1-007-comunicaciones-typo.png`
- **Sospecha técnica:** `src/app/(dashboard)/director/grades/page.tsx:29` y `director/notifications/page.tsx:62` arman el plural agregando "es" a "evaluación"/"comunicación". Revisar los equivalentes de `administrativo/`.
- **Criterio de aceptación:** se usa un helper de plural con las dos formas completas.

### QA1-008: Material institucional: el input de archivo aparece en inglés ("Choose File / No file chosen")

- **Tipo:** Texto-i18n · **Severidad:** Baja · **Rol y ruta:** director, `/director/documents` (y probablemente el portal profesor)
- **Esperado:** botón "Elegir archivo" y texto "Ningún archivo seleccionado", con estilo propio (input oculto + label).
- **Evidencia:** `evidencias/QA1-008-choose-file.png`
- **Criterio de aceptación:** no hay textos en inglés en el selector de archivos, con cualquier idioma del navegador.

### QA1-009: Los endpoints `/api/cron/*` no piden autenticación en desarrollo, y la base de dev es producción

- **Tipo:** Seguridad · **Severidad:** Alta (por el contexto actual) · **Rol y ruta:** anónimo, `/api/cron/{overdue-alert,payment-reminder,class-reminder,daily-report,risk-detection}`
- **Descripción:** con `NODE_ENV === "development"` se saltea el chequeo de `CRON_SECRET` (`src/app/api/cron/*/route.ts:5-11`), y además `proxy.ts` excluye `api/`. Cualquiera que llegue a un dev server (local, túnel o preview mal configurado) puede disparar con un GET emails a alumnos reales y la restricción de acceso por mora (`overdue-alert`). Ya figuraba como E-04 (🟢) en `hallazgos.md`, pero con la base de dev apuntando a producción el riesgo deja de ser menor.
- **No ejecutado.**
- **Criterio de aceptación:** los cron exigen `CRON_SECRET` siempre (también en dev) y/o la base de dev deja de ser la de producción.

### QA1-010: Configuración de notificaciones: "Horas de anticipación" no tiene efecto y los textos se contradicen

- **Tipo:** Bug / Texto · **Severidad:** Media · **Rol y ruta:** director, `/director/settings/notifications` y `/director/settings/automations`
- **Actual:** el toggle dice "Aviso a alumnos la noche anterior a cada clase"; la configuración avanzada dice "se enviará 24 horas antes de cada clase"; Automatizaciones dice "todos los días a las 20:00 … la clase del día siguiente". Son tres definiciones distintas, Revisando el código, `timingHours` se valida (1–72) y se guarda en `notification_settings`, pero **nadie lo lee**: `src/modules/notifications/services/cron.service.ts:33-35` solo consulta `enabled`, y el cron corre a horario fijo. El director cambia el valor, ve "Guardado" y el comportamiento no cambia. No se guardó nada, porque es configuración global.
- **Evidencia:** `evidencias/QA1-010-config-recordatorio.png`
- **Criterio de aceptación:** una sola definición, y el campo de horas cambia el comportamiento del cron o se elimina.

### QA1-011: Reportes: formatos numéricos inconsistentes; "% Asistencia" se exporta como texto

- **Tipo:** Mejora UX · **Severidad:** Baja · **Rol y ruta:** director, `/director/reports` y `/api/reports/*`
- **Actual:** en el Excel de asistencia, "% Asistencia" sale como texto `"100.0"` (no se puede sumar ni ordenar como número); las fechas salen como texto `"19/5/2026"`. En pantalla se mezclan "69.2%" y "7.13" (punto decimal) con "$120.000" (formato es-AR). La "Proyección de recaudación" grafica una sola barra (mayo) y dice "regresión lineal sobre el último mes cobrado", que con un solo punto no es una regresión. Los nombres de archivo no llevan fecha (`reporte-pagos.xlsx`).
- **Evidencia:** `evidencias/QA1-011-reportes.png`
- **Criterio de aceptación:** porcentajes y fechas como valores numéricos o de fecha en Excel; formato es-AR (coma decimal) en pantalla; nombre de archivo con fecha; proyección oculta o explicada cuando hay menos de 2 meses de datos.

### QA1-012: Escala de niveles con inglés mezclado ("Upper-intermedio")

- **Tipo:** Texto-i18n · **Severidad:** Baja · **Rol y ruta:** director/administrativo, `/director/students/new` (guía de puntaje del test de nivelación)
- **Actual:** "71–85 pts Upper-intermedio". **Esperado:** el label de `LEVEL_LABELS` (p. ej. "Intermedio alto").
- **Evidencia:** `docs/qa-2026-10/evidencias/` `evidencias/QA1-012-upper-intermedio.png`
- **Criterio de aceptación:** ningún texto de nivel mezcla inglés y español.

### QA1-013: Inconsistencias visuales menores entre pantallas

- **Tipo:** Mejora UX · **Severidad:** Baja · **Rol y ruta:** director, varias
- Formularios con el orden de botones invertido: `users/new` pone "Crear | Cancelar" a la izquierda; `students/new`, `courses/new` y `payments/new` ponen "Cancelar | Registrar" a la derecha.
- Back link `← Sección` solo en algunos formularios (`payments/new`, `notifications/new`, `users/new`, `assessments/new`), no en `students/new`, `courses/new`, `grades/new` ni `teacher-evaluations/new`.
- `teacher-evaluations/new` no tiene botón Cancelar y su submit ocupa todo el ancho.
- Tablas que usan "Ver →" (asistencia, autoevaluaciones, marketing) en vez del ícono `Eye` de la convención; las tablas de Promociones, Cierre de ciclo y Marketing tienen encabezados en Title Case mientras el resto está en MAYÚSCULAS.
- El botón "+ Nueva evaluación" de Autoevaluaciones es más chico que el resto de los botones primarios de cabecera.
- **Criterio de aceptación:** un patrón único de cabecera, de botones de formulario y de acción de fila, según `CLAUDE.md`.

### QA1-014: Alta de curso imposible (validación en inglés) → **REABIERTO/PERSISTE: SCRUM-236**, y además "Invalid UUID" con "Sin asignar"

- **Tipo:** Bug · **Severidad:** Alta · **Rol y ruta:** director, `/director/courses/new`
- **Pasos:** completar "E2E QA1 Curso Ñandú — Turno Tarde", nivel Intermedio, Lun+Mié 18:00, cupo 12, docente "Sin asignar" → "Crear curso".
- **Actual:** no se envía nada (sin POST). Aparece "Invalid input: expected array, received undefined" bajo Horario (aunque el preview muestra "Lun/Mié 18:00–19:30") y **"Invalid UUID"** bajo Docente. Los dos mensajes están en inglés. El cupo 12 elegido no se ve resaltado (QA1-001; estilo calculado `rgba(255,255,255,0.08)` con texto blanco).
- **Esperado:** el curso se crea; "Sin asignar" es un valor válido en el alta (la regla de SCRUM-252 sobre la edición aplica también acá).
- **Evidencia:** `evidencias/QA1-014-alta-curso-bloqueada.png`
- **Sospecha técnica:** `CourseForm.tsx` + `createCourseSchema` (`classDays` fuera de RHF; `teacherId` `""` contra la validación de uuid).
- **Criterio de aceptación:** el alta con y sin docente funciona; ningún mensaje de Zod llega en inglés a la UI.

### QA1-015: Alta de alumno sin nivel: no pasa nada → **REABIERTO/PERSISTE: SCRUM-235**; el puntaje no asigna el nivel aunque el texto lo promete

- **Tipo:** Bug · **Severidad:** Media · **Rol y ruta:** director, `/director/students/new`
- **Pasos:** completar todos los datos válidos con "Puntaje del test" = 60 y nivel "Sin asignar" → "Registrar alumno".
- **Actual:** no se dispara ningún POST, no aparece ningún toast ni error (SCRUM-235 sigue igual). Además, el helper dice "El nivel se asigna automáticamente como referencia", pero al cargar 60 el select queda en "Sin asignar" (no hay lógica de puntaje a nivel en `StudentForm.tsx`). Se puede guardar un puntaje de 60 con el nivel "Elemental (21–40 pts)" sin ningún aviso de inconsistencia.
- **Criterio de aceptación:** el alta sin nivel funciona; al cargar el puntaje se sugiere o asigna el nivel de la tabla, o se elimina el texto engañoso.

### QA1-016: Las server actions quedan colgadas minutos, sin timeout ni feedback

> ⚠️ **Causa: la conexión de Postgres no se recupera tras un corte de red** (el Dev registra el cuelgue; no se carga como QA). El coordinador confirmó cortes de red/DNS locales durante esta franja (además de un reinicio del dev server). La **lentitud** se atribuye al entorno y **no** se reporta como bug. Lo que sí queda como hallazgo es la **falta de feedback**: ante una mutación que no responde, la UI no tiene timeout ni mensaje de error.

- **Tipo:** Mejora UX · **Severidad:** Baja · **Rol y ruta:** director, `/director/students/new`, `/director/payments/new` (y en general cualquier mutación)
- **Pasos:** con varios usuarios concurrentes (hoy, los otros agentes de QA), enviar un alta de alumno o de pago.
- **Actual:** el POST de la server action no recibió respuesta en más de 120 s (3 intentos, en dos formularios distintos); el botón queda en "cargando" indefinidamente, sin toast de error ni posibilidad de reintentar. En paralelo, las páginas no cacheadas (`/director/payments`, `/director/users?role=alumno`) tardan más de 120–150 s, mientras que las cacheadas responden en 1 s. Es consistente con la única conexión a Postgres (`max: 1`, ver E-01 de `hallazgos.md`): una query lenta o colgada bloquea a todo el servidor.
- **Esperado:** las mutaciones terminan en pocos segundos o fallan con un mensaje claro ("No pudimos guardar, reintentá").
- **Evidencia:** `evidencias/QA1-016-accion-colgada.png` (botón "Registrar alumno" deshabilitado con spinner)
- **Nota:** en producción (Vercel) cada instancia tiene su propia conexión, así que el impacto puede ser menor, pero el dev server compartido queda inutilizable.
- **Criterio de aceptación:** pool de más de 1 conexión (o `statement_timeout`) y un timeout en el cliente con un toast de error.

### QA1-017: Avatar: el `contentType` lo decide el cliente y solo se valida la extensión

- **Tipo:** Seguridad · **Severidad:** Media · **Rol y ruta:** cualquier rol, `/<rol>/profile`
- **Descripción (por código, no explotado):** `src/modules/profile/actions.ts:28-42` valida el tamaño y la **extensión** del nombre (`jpg/png/webp`), pero sube con `contentType: avatarFile.type` (el que envía el navegador) a un bucket **público**. Un archivo con extensión de imagen y tipo `text/html` quedaría servido como HTML desde la URL pública del bucket (hosting de contenido arbitrario bajo el dominio de Supabase del proyecto). Además, como el path es fijo (`avatar.<ext>`), cambiar de `.png` a `.jpg` deja el archivo viejo en el bucket, y la URL fija sin `?v=` hace que el navegador pueda mostrar el avatar anterior desde la caché.
- **Criterio de aceptación:** validar los magic bytes o el MIME del servidor, forzar el `contentType` a partir del tipo detectado, borrar el avatar anterior y agregar cache-busting a la URL.

### QA1-018: Detalles menores de auth

- **Tipo:** Mejora UX · **Severidad:** Baja · **Rol y ruta:** público, `/login`, `/403`, `/invite`
- Login con los campos vacíos: dice "Email inválido" en vez de "Ingresá tu email".
- `/403` no tiene el logo ni el footer de Smart Learning (la página 404 sí), y a un usuario **sin sesión** le dice "No tenés permisos" en vez de mandarlo al login.
- `/invite/%%%` devuelve un 400 crudo del framework en vez de la página "Link inválido".
- **Criterio de aceptación:** mensajes de requerido específicos; 403 con el mismo branding que la 404; los links de invitación malformados muestran una página amigable.

### QA1-019: Mobile: las tablas de Promociones y Cierre de ciclo se cortan y el botón "Promover" queda fuera de la pantalla

- **Tipo:** Mejora UX (responsive) · **Severidad:** Media · **Rol y ruta:** director, `/director/promotions`, `/director/year-end` (390x844)
- **Pasos:** abrir las dos pantallas en un celular.
- **Actual:** la tabla se corta a la derecha (la columna "Promedio" se ve a medias); "Estado" y el botón **"Promover"** solo se alcanzan con scroll horizontal dentro de la tarjeta, sin ninguna señal visual de que la tabla sigue. Los badges "Sin datos —" se parten en 2–3 renglones. En cambio, Alumnos y Cursos tienen un layout de tarjetas para mobile que funciona muy bien.
- **Esperado:** el mismo patrón de tarjetas en mobile (o columnas secundarias con `hidden md:table-cell`), con la acción principal visible.
- **Evidencia:** `evidencias/QA1-019-promociones-mobile.png`, `evidencias/QA1-019-cierre-mobile.png`
- **Criterio de aceptación:** a 390 px de ancho se ve el estado de cada alumno y el botón "Promover" sin scroll horizontal; los badges no se parten.

### QA1-020: Los formularios compartidos tienen "Cancelar" y otros links fijos a `/director/...` (ampliación de SCRUM-253)

- **Tipo:** Bug · **Severidad:** Media · **Rol y ruta:** administrativo, formularios de alta compartidos
- **Descripción (por código):** los componentes que reusa el portal administrativo tienen links fijos al portal del director: `StudentForm.tsx:167` (Cancelar → `/director/students`), `EnrollmentForm.tsx:85` (→ `/director/enrollments`), `PaymentForm.tsx:72` (→ `/director/payments`), `NotificationForm.tsx:110` (→ `/director/notifications`); `GradeList.tsx:47,66,117` linkea a `/director/grades/new` y `/director/grades/[id]` (el portal administrativo no tiene `grades/[id]`); `administrativo/payments/[id]/page.tsx:58` lleva al recibo bajo `/director/` (E-03). Como `/director/students` y `/director/payments` **no** están bloqueadas para el administrativo (QA1-005), al tocar "Cancelar" el usuario termina en el portal del director, con otro sidebar. SCRUM-253 cubre reclamos y comunicaciones; esto lo amplía a alumnos, inscripciones, pagos y notas.
- **Esperado:** cada link respeta el portal actual (prop `basePath` o similar).
- **Criterio de aceptación:** un administrativo nunca sale de `/administrativo/*` usando la UI.

### QA1-021: Hay cursos con cupo 20 aunque la regla es 15, y editarlos baja el cupo a 15 en silencio

- **Tipo:** Bug (datos/regla) · **Severidad:** Baja · **Rol y ruta:** director, `/director/courses`, `/director/courses/[id]/edit`
- **Actual:** `Adults 4` (dato real) y los cursos "Inglés Test …" figuran con cupo `x/20`. El schema limita el máximo a 15 (`courses/schemas.ts`), pero la DB no tiene un CHECK (`schema.ts:200`). En la edición, `CourseForm.tsx:48-50` reemplaza cualquier valor mayor a 15 por 15 **sin avisar**, así que guardar cualquier otro cambio reduce el cupo. **No se editó** `Adults 4` (es un dato real).
- **Criterio de aceptación:** CHECK `max_capacity <= 15` en la DB (con migración de los datos existentes) o, si se decide permitir más, el form muestra el valor real; nunca se cambia el cupo sin que el usuario lo vea.

### QA1-022: "Cerrar sesión" cierra todas las sesiones del usuario en todos los dispositivos

- **Tipo:** Mejora UX / Bug · **Severidad:** Baja · **Rol y ruta:** cualquier rol, botón "Cerrar sesión"
- **Pasos:** loguearse con el mismo usuario en dos navegadores; cerrar sesión en uno.
- **Actual:** la otra sesión también queda invalidada (las cookies guardadas del director dejaron de funcionar, con un 307 a `/login`, después de un logout hecho desde otro navegador). Para el personal que usa la PC del instituto y el celular a la vez, cerrar sesión en uno lo saca del otro.
- **Sospecha técnica:** `src/modules/auth/actions.ts:115` llama a `supabase.auth.signOut()` sin `scope`; en Supabase el default es `global`.
- **Criterio de aceptación:** `signOut({ scope: "local" })` (y, si se quiere, una opción explícita de "Cerrar sesión en todos los dispositivos").
- **Nota para el equipo:** este logout pudo cortar las sesiones de `director@e2e.test` de otros agentes alrededor de las 17:54.

### QA1-023: Borrar un alumno es un borrado duro en cascada que se lleva su historial de pagos, con una confirmación genérica

- **Tipo:** Bug / Mejora UX (integridad de datos) · **Severidad:** Alta · **Rol y ruta:** director/administrativo, `/director/students/[id]` → Eliminar
- **Pasos:** detalle de un alumno con pagos → "Eliminar" → "Confirmar".
- **Actual:** `deleteStudent` hace `DELETE FROM students` y, por `ON DELETE CASCADE` (`schema.ts:266`, `payments.student_id`), **se borran también todos sus pagos** (y las inscripciones, la asistencia y las notas). Eso contradice la decisión de diseño D-02 de `hallazgos.md` ("anulación, no eliminación: borrar rompería la trazabilidad contable"). La confirmación no nombra al alumno ni avisa cuántos pagos o inscripciones se van a perder. Además, `profiles` y `auth.users` **quedan huérfanos** (el usuario sigue pudiendo loguearse, pero ya no tiene una fila de alumno). Ocurrió en la práctica durante este QA (ver el incidente).
- **Esperado:** baja lógica (estado "Dado de baja" o "Egresado"), o bloquear el borrado si tiene pagos o inscripciones; una confirmación que diga "Vas a eliminar a <nombre> (DNI …) y N pagos"; y que el borrado limpie o desactive también el usuario.
- **Criterio de aceptación:** no se puede perder historial contable desde la UI; la confirmación muestra el nombre y el impacto; no quedan perfiles ni usuarios de auth huérfanos.

### QA1-024: El buscador de Alumnos no filtra al escribir

- **Tipo:** Bug / Mejora UX · **Severidad:** Media · **Rol y ruta:** director, `/director/students`
- **Pasos:** escribir "ñandú", "nandu" o el DNI de un alumno en "Buscar por nombre, email o DNI…" y esperar 2,5 s.
- **Actual:** la tabla no cambia (seguía mostrando las primeras filas, de 10 a 17), la URL no agrega `?q=` y no hay ningún indicador de búsqueda. El usuario cree que filtró y opera sobre la fila equivocada (fue la causa directa del incidente).
- **Pendiente de confirmar:** si filtra solo con Enter. Si es así, hace falta un botón o un hint "Enter para buscar", o debounce.
- **Criterio de aceptación:** al escribir (con debounce) o con un botón visible, la tabla se filtra y la URL refleja `?q=`.

### Nota de entorno (no es un hallazgo QA): cuelgue de la conexión de Postgres

Para el Dev, que lo está investigando: en mi último intento, la **última página que respondió** con datos de la DB fue `/director/complaints` (19:00:10, 4,5 s) y la **primera que se colgó** fue `/director/payments` (19:00:15; ya a las 18:57 devolvía solo el shell de 58 KB sin terminar). Después de eso quedaron encoladas `/director/grades`, `/director` y `/director/enrollments` (más de 25 s), mientras que las páginas con `unstable_cache` (Alumnos, Docentes) seguían respondiendo en 1 s. Toda la tarde, `/director/payments` y `/administrativo/payments` fueron las pantallas que se colgaron primero, de forma repetida, incluso después de reiniciar el server. **Sugerencia:** revisar `getPayments()` (`src/modules/payments/services/payments.service.ts`) como posible query que bloquea la conexión.

### Hallazgos previos re-verificados

| Ticket | Estado | Evidencia |
|---|---|---|
| SCRUM-235 (alta de alumno sin nivel) | **PERSISTE** | QA1-015 |
| SCRUM-236 (alta de curso) | **PERSISTE** | QA1-014 |
| SCRUM-240 (validaciones de fecha) | **PERSISTE** | El alta de pago acepta vencimiento 01/01/2020 sin aviso del lado del cliente (el POST salió; ver QA1-016). |
| SCRUM-234 (borrar desde el detalle → 404) | **PERSISTE** | Después de "Confirmar" no hubo toast y la URL quedó en el detalle mostrando la 404 (ocurrió sobre el registro equivocado; ver el incidente). |
| SCRUM-242 (la edición no persiste) | **PERSISTE** | Toast "Alumno actualizado" en 1,9 s, pero al recargar el nombre y el teléfono seguían iguales. |
| SCRUM-253 (administrativo sale a `/director`) | **PERSISTE y se amplía** | QA1-020 |
| E-04 de `hallazgos.md` (cron sin `CRON_SECRET` en dev) | **PERSISTE, sube de severidad** | QA1-009 |
| SCRUM-237 (warning `non-boolean attribute error`) | **PERSISTE** | Consola en `/login`, `/director/courses/new`, `/director/grades/new`, `/director/documents`. |
| SCRUM-245 (reportes administrativo 403) | **PERSISTE** | `/api/reports/*` con la cookie del administrativo → 403 `application/json`. |
| SCRUM-188 / SCRUM-190 (escala 0–100 y 70%) | **PERSISTE** | Promociones: "asistencia ≥ 80% · promedio ≥ 7.0"; Notas "(1-10)". Además, Reportes compara "Asistencia < 70%" mientras el resto del sistema usa 80% (umbral inconsistente dentro de la misma app). |

---

## 3. Verificado y funciona bien

- Login por la UI para director y administrativo, con redirect al portal correcto.
- Las 11 rutas exclusivas de dirección redirigen al administrativo a `/403`, con una página "Acceso denegado" clara.
- Las APIs de reportes devuelven 401 sin sesión y el director descarga los 3 Excel con encabezados en español y datos correctos.
- Las 34 pantallas del portal director cargan con 200 y sin errores JS (`pageerror`); los tiempos típicos fueron de 1,5 a 2,5 s, con 4–6 s en el dashboard y el cierre de ciclo.
- No hay scroll horizontal en desktop en ninguna pantalla del director.
- Automatizaciones: cada "Ejecutar ahora" pide una confirmación que describe el impacto (p. ej. "verán su acceso restringido").
- Estados vacíos claros en Riesgo de abandono y Reclamos.
- Login: errores inline para vacío y formato, mensaje claro para credenciales inválidas, "Recordarme".
- Forgot-password con mensaje neutral (no permite enumerar usuarios); update-password sin sesión muestra "Link inválido o expirado".
- La 404 está bien diseñada y tiene "Ir al inicio" / "Volver atrás".
- Logout: después de cerrar sesión, ni el botón atrás ni la URL directa devuelven contenido protegido.
- Variantes de URL (`/DIRECTOR/users`, `/director/%75sers`, `/director//users`) no saltean el bloqueo del proxy.
- Mobile: las listas de Alumnos y Cursos tienen un layout de tarjetas excelente; el drawer del sidebar funciona.
- Pago: validación de monto (vacío, 0, negativo, no numérico → "El monto debe ser mayor a 0") y alumno requerido.
- Alta de alumno: validaciones inline (nombre, DNI 7–8 dígitos, email, fecha requerida); el nombre filtra los dígitos al tipear.
- Cada "Ejecutar ahora" de Automatizaciones pide una confirmación que describe el impacto. **No se ejecutó ninguno**, y tampoco "Actualizar vencidos" ni "Verificar alertas y mora" (procesos masivos).

---

## 4. Datos creados o modificados durante el testeo (para limpieza)

| Tabla / entidad | Nombre / ID | Acción | Estado |
|---|---|---|---|
| auth (sesión) | `alumno@e2e.test` | Se generó un link de recovery al reproducir DEV-001 (no se cambió la contraseña ni se modificó ningún dato) | Sin cambios persistentes |
| students + profiles + auth.users | "QA Uno Ñandú Pérez", DNI 90252652, `qa1-252652@e2e.test` (nivel Intermedio, puntaje 60, tel. 3511234567) | **Creado** en la segunda pasada (alta OK en 2,4 s; el doble click generó 1 solo POST ✅) | **Existe. Borrar** (`students`, `profiles` y `auth.users`). Los intentos colgados de la mañana no dejaron registros |
| **students + payments (DATO REAL)** | **Alumna real** (datos personales omitidos), `students.id 9a444b3f-e679-41fa-93c2-5f26ffb11b48` + 1 pago de $15.000 | **Borrado por error** (ver el incidente) | **RESTAURAR desde backup/PITR.** `profiles` y auth intactos |
| payments | Alumno E2E, $15.000,50, notas "E2E QA1…" | El POST de la mañana quedó colgado | Verificado en la segunda pasada: **no se creó** |
| auth (sesiones) | `director@e2e.test` | Logout de prueba (~17:54) que, por QA1-022, invalidó **todas** las sesiones de ese usuario | Sin datos que limpiar; los demás agentes deben volver a loguearse |
| — | — | Fuera de eso, solo navegación y logins por la UI (sin altas ni modificaciones) | — |
