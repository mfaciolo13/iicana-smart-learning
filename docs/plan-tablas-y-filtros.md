# Plan de acción — tablas, orden y filtros

Análisis del 15/10/2026 de los 20 listados del sistema. Objetivo: que cualquier listado se pueda **ordenar por columna (asc/desc)**, **filtrar** y **paginar**, con el mismo comportamiento en todos los roles y que los Excel respeten lo que se ve en pantalla.

## 1. Dónde estamos

Hay 20 listados (tablas) y hoy tres de ellos tienen orden y paginación (PR #246): alumnos, pagos e inscripciones. El resto se muestra completo, en un orden fijo, y casi ninguno tiene filtros.

| # | Listado | Roles | Columnas | Búsqueda | Filtros hoy | Orden | Paginación | Límite duro / observación |
|---|---|---|---|---|---|---|---|---|
| 1 | Alumnos | D, A | Nombre, DNI, Email, Nivel, Estado | Sí | — | **Sí** | **Sí** | Cache de 5 min |
| 2 | Pagos | D, A | Alumno, Monto, Vencimiento, Recibo, Estado | — | Pestañas por estado | **Sí** | **Sí** | Sin búsqueda por alumno |
| 3 | Inscripciones | D, A | Alumno, DNI, Curso, Nivel, Fecha, Estado | Sí | — | **Sí** | **Sí** | Sin filtro por estado ni curso |
| 4 | Docentes | D | Nombre, DNI, Email, Especialización | Sí | — | No | No | |
| 5 | Cursos | D | Curso, Nivel, Horario, Docente, Cupo, Estado | Sí | — | No | No | Sin filtro por nivel/estado/docente |
| 6 | Usuarios | D | Usuario, Email, Rol, Alta | Sí | Rol | No | No | |
| 7 | Notas | D, A, P | Alumno, Curso, Tipo, Nota, Fecha | — | Curso | No | No | Sin búsqueda ni filtro por tipo/rango de nota/fecha |
| 8 | Asistencia (clases) | D, A, P | Fecha, Curso, Presentes, Ausentes, % | — | — | No | No | **Corta en 1500 registros** (`limit(1500)`) |
| 9 | Reclamos | D, A | Usuario, Tipo, Descripción, Estado, Fecha | — | Pestañas por estado | No | No | Sin filtro por tipo ni fecha |
| 10 | Autoevaluaciones | D, P | Evaluación, Curso, Estado, Preguntas, Intentos | — | — | No | No | |
| 11 | Material | D, P, A | Nombre, Descripción, Tamaño, Subido por, Fecha | — | — | No | No | |
| 12 | Marketing: campañas | D | Campaña, Canal, Período, Consultas, Inscriptos, Conversión | — | — | No | No | |
| 13 | Marketing: consultas | D | Nombre, Contacto, Fecha, Estado | — | — | No | No | |
| 14 | Promociones | D | Alumno, Curso, Asistencia, Promedio, Estado | — | — | No | No | Muestra a todos con su estado; sin filtro por curso ni por "aptos" |
| 15 | Cierre de ciclo | D | Alumno, Curso, Asistencia, Promedio, Resultado | — | — | No | No | |
| 16 | Evaluación docente | D | Docente, Calificación, Encuestas, Observaciones, Última obs. | — | — | No | No | |
| 17 | Riesgo de abandono | D | (tarjetas) | — | — | No | No | |
| 18 | Mi asistencia | Alumno | Fecha, Curso, Estado | — | — | No | No | |
| 19 | Mis notas | Alumno | Tipo, Nota, Fecha, Observaciones | — | — | No | No | Agrupado por curso |
| 20 | Mis pagos | Alumno | Vencimiento, Monto, Estado, Pagado | — | — | No | No | |

D = director, A = administrativo, P = profesor.

### Problemas que se desprenden

1. **Orden fijo en 17 de 20 listados.** El usuario no puede ver "las notas más bajas primero" ni "las cuotas más viejas".
2. **Casi no hay filtros.** Sólo existen pestañas por estado en pagos y reclamos, el filtro de rol en usuarios y el selector de curso en notas. No hay filtro por nivel, curso, docente, tipo, período ni rango de valores.
3. **Los listados se cargan completos.** Funciona con 11 alumnos; con cientos, las páginas se vuelven lentas y largas. La asistencia ya **pierde datos** a partir de 1500 registros (`limit(1500)` sin paginación ni aviso).
4. **Los filtros no se reflejan en la URL** (salvo `q`, `status` y `role`): no se pueden compartir ni sobreviven a recargar.
5. **Los Excel no respetan lo que se ve.** Los reportes exportan siempre todo, sin importar los filtros de la pantalla.
6. **Inconsistencias entre roles.** Director y administrativo duplican páginas casi idénticas (alumnos, pagos, inscripciones, reclamos, notas, asistencia), así que cada mejora se hace dos veces y se puede olvidar una.
7. **Orden y paginación en memoria.** Hoy ordeno y pagino sobre la lista ya cargada (correcto para cientos de filas, insuficiente para miles).

## 2. Diseño propuesto (un solo patrón para todos)

**Estado en la URL.** Todo lo que el usuario elige vive en la query string: `?q=&estado=&nivel=&curso=&desde=&hasta=&sort=&dir=&page=`. Sirve para compartir, recargar y volver atrás. Un parámetro inválido se ignora, nunca rompe la página.

**Componentes compartidos** (en `src/components/ui`, ya existe la base en `TableControls.tsx` y `lib/table.ts`):

| Componente | Función |
|---|---|
| `SortableTh` + `Pagination` | **Hecho.** Orden asc/desc por columna y paginación con enlaces. |
| `FilterBar` | Barra sobre la tabla con la búsqueda y los filtros del listado, en una sola fila que se pliega en el celular. |
| `SelectFilter` / `ChipFilter` | Filtro de una opción (nivel, curso, docente, tipo) o de varias (estado) con chips. |
| `DateRangeFilter` | "Desde / hasta" con atajos (este mes, mes pasado, últimos 30 días). |
| `ActiveFilters` | Muestra los filtros aplicados como chips con una "x" y el botón "Limpiar filtros". |
| `ResultSummary` | "Mostrando 1–25 de 120 · filtrado por: Intermedio, Vencidos". |
| `ExportButton` | Descarga el Excel **con los mismos filtros** que tiene la pantalla. |

**Filtrar en SQL cuando crece.** Regla: hasta ~500 filas se filtra y ordena en memoria (como ahora); por encima, el filtro, el orden y `LIMIT/OFFSET` pasan a la consulta de la base. Para no escribirlo dos veces, cada listado define una vez sus **campos filtrables y ordenables** (una "definición de tabla") y de ahí salen la validación de la URL, la consulta y los controles.

**Un solo listado para director y administrativo.** Extraer la página a un componente compartido que reciba el rol y la ruta base; las páginas de cada rol quedan en tres líneas.

**Accesibilidad.** Encabezados con `aria-sort`, filtros con etiquetas visibles, foco visible y que todo funcione con teclado. Estados vacíos distintos: "no hay datos" frente a "ningún resultado con estos filtros" (con botón para limpiar).

## 3. Filtros y orden por listado

| Listado | Filtros a agregar | Ordenar por |
|---|---|---|
| Alumnos | Nivel, estado (chips), curso en el que está inscripto, con/sin deuda, acceso restringido | Nombre, DNI, nivel, estado, fecha de alta |
| Pagos | Búsqueda por alumno/DNI, estado, rango de vencimiento, método, monto desde/hasta, con/sin recibo | Alumno, monto, vencimiento, estado, fecha de pago |
| Inscripciones | Estado, curso, nivel, rango de fecha | Todas (ya) |
| Docentes | Especialización, con/sin cursos asignados | Nombre, DNI, cantidad de cursos |
| Cursos | Nivel, estado, docente, día de la semana, con cupo disponible | Nombre, nivel, ocupación, estado |
| Usuarios | Rol (ya), estado (activo/pendiente/bloqueado), rango de alta | Nombre, rol, alta, último ingreso |
| Notas | Curso (ya), alumno, tipo de evaluación, rango de fecha, aprobadas/desaprobadas, rango de nota | Alumno, curso, tipo, nota, fecha |
| Asistencia | Curso, rango de fecha, % menor a (alerta) | Fecha, curso, % asistencia, ausentes |
| Reclamos | Estado (ya), tipo, rango de fecha, usuario | Fecha, estado, tipo |
| Autoevaluaciones | Curso, estado | Fecha, intentos, curso |
| Material | Curso, tipo de archivo, subido por | Nombre, tamaño, fecha |
| Marketing | Canal, período, estado de la consulta | Conversión, consultas, fecha |
| Promociones / Cierre de ciclo | Curso, nivel, resultado | Asistencia, promedio, alumno |
| Evaluación docente | Rango de calificación, con/sin observaciones | Calificación, encuestas |
| Alumno: asistencia, notas, pagos | Curso, rango de fecha, estado | Fecha, nota, vencimiento |

## 4. Plan de acción por fases

**Fase 0 — Base (S).** Ya hecha en el PR #246: orden y paginación con enlaces, helpers con tests, tres listados migrados.

**Fase 1 — Filtros en los listados que más se usan (M, 2–3 días).**
- Construir `FilterBar`, `SelectFilter`, `ChipFilter`, `DateRangeFilter`, `ActiveFilters`, `ResultSummary` con tests de la lógica de URL.
- Aplicar a **Alumnos, Pagos e Inscripciones** (director y administrativo): ya tienen orden y paginación, así que se ve el cambio completo.
- Búsqueda por alumno/DNI en Pagos (hoy no existe).
- Criterio de aceptación: los filtros se combinan, quedan en la URL, "Limpiar filtros" los borra, el contador refleja el resultado y el estado vacío distingue "sin datos" de "sin resultados".

**Fase 2 — Orden y paginación en el resto de los listados (M, 2–3 días).**
- Cursos, Docentes, Usuarios, Notas, Reclamos, Autoevaluaciones, Material, Marketing, Promociones, Cierre de ciclo, Evaluación docente.
- Las vistas del alumno (asistencia, notas, pagos) con orden y filtro por curso y fecha.
- Criterio: todas las columnas relevantes ordenan en ambos sentidos y el orden por defecto es el más útil para cada tabla.

**Fase 3 — Asistencia sin pérdida de datos (S–M, 1–2 días).**
- Reemplazar el `limit(1500)` por filtros (curso y fechas) y paginación en SQL, con aviso cuando haya más resultados.
- Es la única tabla que hoy **descarta datos en silencio**, así que va antes que la mejora estética.

**Fase 4 — Los Excel respetan los filtros (M, 2 días).**
- Las rutas `/api/reports/*` aceptan los mismos parámetros que la pantalla; el botón "Exportar" los reenvía.
- Un test por reporte que verifique que lo exportado coincide con lo filtrado.

**Fase 5 — Una sola página para director y administrativo (M, 2–3 días).**
- Componentes compartidos por listado (`StudentsPage`, `PaymentsPage`...) con el rol y la ruta base como parámetros.
- Beneficio: cada mejora se escribe una vez; elimina la causa de bugs como los de "el administrativo termina en /director".

**Fase 6 — Filtrado en SQL para volumen (L, 3–5 días, cuando haga falta).**
- Pasar filtro, orden y paginación a la base en los listados que superen ~500 filas.
- Índices de apoyo: `payments(status, due_date)`, `attendance(class_date)`, `grades(evaluated_at)`, `enrollments(status)`.
- Disparador: cuando algún listado pase de ~500 filas o su página supere 1 s.

**Fase 7 — Extras (opcionales).** Vistas guardadas ("Mis morosos"), selección múltiple con acciones en lote (cobrar o anular varias cuotas), columnas configurables, exportar sólo la selección.

### Orden recomendado y estimación

| Fase | Esfuerzo | Valor | Dependencias |
|---|---|---|---|
| 1. Filtros en alumnos, pagos, inscripciones | 2–3 días | Muy alto | #246 mergeado |
| 3. Asistencia sin pérdida de datos | 1–2 días | Alto (corrige un riesgo real) | — |
| 2. Orden/paginación en el resto | 2–3 días | Alto | Fase 1 (reutiliza los controles) |
| 4. Excel con filtros | 2 días | Alto | Fase 1 |
| 5. Páginas compartidas por rol | 2–3 días | Medio (mantenimiento) | Fases 1–2 |
| 6. Filtrado en SQL | 3–5 días | Según volumen | Fases 1–2 |
| 7. Extras | a definir | Bajo–medio | — |

Total de las fases 1 a 5: unos **9 a 13 días de trabajo**.

## 5. Riesgos y cómo evitarlos

- **Filtrar en memoria no escala.** Mitigación: la regla de los ~500 registros de la Fase 6 y medir el tiempo de las páginas después del deploy.
- **Filtros incompatibles con el caché.** Los alumnos vienen de una lista cacheada 5 minutos; si se filtra por "con deuda", habrá que cruzar con pagos. Mitigación: calcular el filtro en SQL desde el principio en ese caso.
- **Duplicar lógica entre roles.** Se resuelve con la Fase 5; mientras tanto, cada cambio debe aplicarse a las dos páginas y revisarse en las dos.
- **Parámetros de URL maliciosos.** Todo valor se valida contra una lista cerrada (como hace `parseTableQuery`); un valor desconocido se ignora.
- **Accesibilidad y celular.** Verificar cada barra de filtros en pantalla angosta y con teclado antes de dar la fase por terminada.

## 6. Cómo se prueba cada fase

- **Unitarios** de las funciones puras (parseo de la URL, combinación de filtros, rangos de fechas).
- **Una prueba por listado** con datos conocidos: aplicar un filtro, ordenar, paginar y comprobar el resultado.
- **Verificación manual por rol** después del deploy, como la que se hizo hoy con los cuatro roles.
- **Excel:** comparar cantidad de filas del archivo con el contador de la pantalla filtrada.

## 7. Decisiones que necesito de vos

1. **Tamaño de página:** hoy es 25. ¿Querés 25, 50 o que cada usuario elija?
2. **Filtro por defecto en pagos:** ¿abrir mostrando todos o sólo los vencidos y pendientes?
3. **Alcance de la Fase 5:** unificar las páginas de director y administrativo es la mejora más grande de mantenimiento, pero toca muchos archivos. ¿La hacemos ahora o después de cerrar los bugs?
4. **Vistas guardadas y acciones en lote (Fase 7):** ¿las querés para la defensa de la tesis o quedan como trabajo futuro?
