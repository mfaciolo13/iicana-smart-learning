# Mejoras propuestas — Smart Learning

Documento vivo para convertir en tickets de Jira. Cada ítem tiene un ID, el problema, la propuesta, el esfuerzo (S ≤ 1 día, M ≤ 3 días, L > 3 días) y el estado.
Redactado el 15/10/2026 a partir de la prueba manual por los cuatro roles y de las mediciones en producción.

Estados: **Hecho** (en un PR), **En curso**, **Propuesto**, **Necesita decisión**.

---

## 1. Rendimiento (prioridad: máxima)

Medición del 15/10/2026 en producción, alumno: TTFB de 430–700 ms incluso en páginas de una sola consulta (reclamos, pagos); la primera visita llegó a 2 s. El panel del director hace más de 10 consultas en serie. El encabezado `x-vercel-id` muestra `gru1::iad1`: las funciones corrían en Virginia y la base está en Oregon (`us-west-2`). Cada consulta de Drizzle o de PostgREST pagaba ese viaje.

| ID | Mejora | Detalle | Esf. | Estado |
|---|---|---|---|---|
| P-01 | Función y base en la misma región | `vercel.json`: `regions: ["pdx1"]` (Portland, la más cercana a `us-west-2`). Costo: ~80 ms extra desde Argentina por request, contra una baja fuerte por consulta. Volver a medir al desplegar. | S | Hecho (PR #244) |
| P-02 | Verificar el JWT localmente en `proxy.ts` | Hoy `supabase.auth.getUser()` hace una llamada de red al Auth en **cada** navegación. El proyecto firma con ES256 (JWKS público), así que `getClaims()` verifica la firma localmente y refresca la sesión si vence. Ahorra un viaje por navegación. **Necesita tu decisión**: toca la verificación de login (el clasificador de seguridad lo bloqueó) y conviene revisarlo con cuidado. | S | Necesita decisión |
| P-03 | Rol del usuario sin consulta en cada request a `/director` | `proxy.ts` hace un `select` a `profiles` por cada request a `/director/*` (SCRUM-278). Opciones: poner el rol en `app_metadata` con un hook de Auth y leerlo del JWT, o una cookie firmada con vencimiento corto. | M | Propuesto |
| P-04 | Menos trabajo en el layout | El layout hace en cada navegación: perfil + contador de notificaciones sin leer. Cargar el contador del lado del cliente (o con Suspense) y cachear el perfil unos segundos. | S | Propuesto |
| P-05 | Streaming con Suspense en los paneles | Mostrar al instante el encabezado y los KPIs, y cargar cada gráfico en su propio `<Suspense>` con esqueleto. La página deja de esperar a la consulta más lenta. | M | Hecho (PR #245) |
| P-06 | Consultas agregadas | Reemplazar muchas consultas chicas por pocas consultas con CTE/`json_agg` que devuelven una serie completa. Menos viajes a la base. | M | Hecho (PR #245) |
| P-07 | Caché de analíticas | `unstable_cache` con `revalidate` de 60–300 s y tags que invalidan las mutaciones (pago, nota, asistencia). Los gráficos del director no necesitan tiempo real al segundo. | S | Hecho (PR #245) |
| P-08 | Índices para analítica | Hoy hay índices en las claves foráneas. Faltan `payments(status, due_date)`, `payments(paid_at)`, `attendance(class_date)` y `grades(evaluated_at)`. Con pocos datos no se nota; crecen con el uso. | S | Propuesto |
| P-09 | Tamaño del pool | `max: 1` con `max_pipeline: 0`. Con `max: 4` la ganancia medida fue chica (2,0 s vs 2,6 s para 12 consultas desde mi equipo); medir de nuevo desde `pdx1` antes de decidir. | S | Propuesto |
| P-10 | Medición continua | Activar Vercel Speed Insights y registrar duración de las páginas pesadas, para detectar regresiones antes que los usuarios. | S | Propuesto |

## 2. Gráficos y paneles

La profesora pidió "muchos gráficos"; todos los roles deberían tener y el director "una masa". Hoy hay 4 gráficos, sólo en el panel del director (asistencia por curso, notas por curso, estado de pagos, alumnos por nivel). Recharts ya está instalado.

| ID | Mejora | Detalle | Esf. | Estado |
|---|---|---|---|---|
| G-01 | Kit compartido de gráficos | `src/components/charts`: tarjeta con título/estado vacío, tendencia (área/línea), barras (agrupadas/apiladas/horizontales), dona, anillo de progreso. Paleta y formato es-AR comunes. | M | Hecho (PR #245) |
| G-02 | Director: panel analítico | Altas por mes, cobrado vs facturado por mes, asistencia por mes, notas por mes, distribución de notas, ocupación de cursos, deuda por antigüedad, evaluación docente por docente, riesgo de abandono por nivel, reclamos por estado, consultas por canal. | L | Hecho (PR #245) |
| G-03 | Administrativo: panel operativo | Cobranza por mes, deuda por antigüedad, altas, ocupación de cursos, reclamos. | M | Hecho (PR #245) |
| G-04 | Profesor: gráficos por curso | Asistencia por clase, promedio por tipo de evaluación, distribución de notas, ranking de asistencia por alumno, alumnos con alerta, resultados de autoevaluaciones. | L | Hecho (PR #245) |
| G-05 | Alumno: mi progreso | Anillo de asistencia, evolución de mis notas, mi promedio vs el del curso, cuotas pagadas, resultados de autoevaluaciones. | M | Hecho (PR #245) |
| G-06 | Accesibilidad de los gráficos | Texto alternativo y tabla de datos oculta para lectores de pantalla; no depender sólo del color (etiquetas y patrones). | S | Propuesto |
| G-07 | Gráficos en el Excel exportado | Incluir una hoja de resumen con gráficos nativos de Excel en los reportes. | M | Propuesto |

## 3. Reportes

Los reportes de hoy son tres volcados de tabla a Excel y unas tarjetas de resumen. Un reporte tiene que responder una pregunta ("¿qué cursos pierden alumnos?", "¿cuánto se cobra contra lo esperado?").

| ID | Mejora | Detalle | Esf. | Estado |
|---|---|---|---|---|
| R-01 | Filtros por curso, nivel y período | Todos los reportes (pantalla y Excel) aceptan rango de fechas, curso y nivel, y lo reflejan en la URL. | M | Propuesto |
| R-02 | Reporte de morosidad | Lista de alumnos con deuda: monto, cuotas, días de atraso, último contacto. Con exportación. | M | Hecho (PR #246) |
| R-03 | Reporte de retención | Altas, bajas y permanencia por curso y por mes; lista de alumnos dados de baja. | M | Propuesto |
| R-04 | Boletín del alumno (PDF) | Notas, asistencia y observaciones por curso, imprimible y descargable. | M | Propuesto |
| R-05 | Informe del docente | Asistencia y notas de sus cursos, resultados de autoevaluaciones y su evaluación (sólo el propio). | M | Propuesto |
| R-06 | Comparativas | Mes contra mes y curso contra curso, con variación porcentual. | M | Propuesto |
| R-07 | Programar envío | Resumen semanal por email al director (cobranza, asistencia, alertas). | M | Propuesto |
| R-08 | Excel con formato | Hecho en SCRUM-329 (fechas y montos reales, encabezados). Falta una hoja de resumen. | S | Hecho (parcial) |

## 4. Tablas y listados

| ID | Mejora | Detalle | Esf. | Estado |
|---|---|---|---|---|
| T-01 | Orden por columna | Alumnos, pagos, inscripciones, notas: clic en el encabezado ordena (`?sort=&dir=`). Hecho en alumnos, pagos e inscripciones; faltan notas, docentes, usuarios y asistencia. | M | Hecho (PR #246, parcial) |
| T-02 | Paginación | Listados de 25–50 filas con paginación en el servidor. Hoy se cargan completos. Misma cobertura que T-01. | M | Hecho (PR #246, parcial) |
| T-03 | Filtros guardados y chips | Filtros por estado/curso/nivel visibles como chips y reflejados en la URL. | S | Propuesto |
| T-04 | Acciones en lote | Seleccionar varias filas (por ejemplo cuotas) para cobrar, anular o exportar. | L | Propuesto |
| T-05 | Estados vacíos y de carga consistentes | Esqueletos con la forma real de la tabla; mensajes vacíos con acción sugerida. | S | Propuesto |

## 5. Experiencia por rol

| ID | Mejora | Detalle | Esf. | Estado |
|---|---|---|---|---|
| X-01 | Portal del alumno guiado | "Qué tenés que hacer": encuesta pendiente, cuota por vencer o vencida, próxima clase, autoevaluación sin rendir. | M | Hecho (PR #245) |
| X-02 | Panel del profesor accionable | Clases de hoy con acceso directo a tomar lista, alumnos con 2 ausencias seguidas, notas sin cargar. | M | Hecho (PR #245) |
| X-03 | Panel del director con alertas | Lo que requiere atención arriba (mora, reclamos, riesgo) con enlace directo, y tendencias debajo. | M | Hecho (PR #245) |
| X-04 | Calendario de clases | Vista semanal por curso/profesor/alumno a partir de `class_days` y `class_time`. | L | Propuesto |
| X-05 | Notificaciones por WhatsApp | Recordatorios de clase y cuota; hoy sólo email e internas. | L | Propuesto |
| X-06 | Recibos y certificados en PDF | Descarga directa en vez de imprimir desde el navegador. | M | Propuesto |
| X-07 | Modo oscuro y preferencia de densidad | Opcional; menor prioridad. | M | Propuesto |

## 6. Calidad y operación

| ID | Mejora | Detalle | Esf. | Estado |
|---|---|---|---|---|
| Q-01 | Tests de integración con base real | Los 215 tests son de validaciones y esquemas, no tocan la base: por eso el bug de las transacciones (SCRUM-270) pasó todas las pruebas. Hacen falta tests que ejecuten las acciones contra una base de prueba. | L | Propuesto |
| Q-02 | Proyecto de Supabase separado para pruebas | Dev, E2E y producción comparten la base (SCRUM-269). Crear un proyecto de test con migraciones aplicadas por script. | M | Propuesto |
| Q-03 | E2E en CI | Correr los E2E de Playwright en cada PR contra la base aislada (Q-02). | M | Propuesto |
| Q-04 | Monitoreo de errores | Sentry (o similar) con alertas: hoy los errores de servidor sólo se ven en los logs de Vercel si alguien los busca. | S | Propuesto |
| Q-05 | Migraciones versionadas y aplicadas por script | Hoy se pegan a mano en el SQL Editor. Un runner con registro de migraciones aplicadas evita el desfasaje código/base. | M | Propuesto |
| Q-06 | Bitácora de auditoría | Quién cambió qué (pagos, notas, asistencia, bajas). Hay correcciones de asistencia auditadas, pero no el resto. | M | Propuesto |
| Q-07 | Backups y restauración probada | Verificar el plan de Supabase y ensayar una restauración (SCRUM-266). | S | Propuesto |

## 7. Seguridad

| ID | Mejora | Detalle | Esf. | Estado |
|---|---|---|---|---|
| S-01 | `getClaims()` en el proxy | Ver P-02. | S | Necesita decisión |
| S-02 | Límite de intentos | Rate limit en login, recuperación de contraseña e invitaciones. | M | Propuesto |
| S-03 | Datos sensibles en lecturas por rol | La política de `teachers` deja ver el DNI del docente al alumno (RLS es por fila, no por columna). Exponer sólo nombre mediante una vista. | S | Propuesto |
| S-04 | Segundo factor para Dirección | TOTP para el rol director. | M | Propuesto |
| S-05 | Cabeceras de seguridad | CSP, `X-Frame-Options`, `Referrer-Policy` en `next.config`. | S | Propuesto |
| S-06 | Revisión de cuentas inactivas | Vencimiento de invitaciones y baja automática de cuentas sin uso. | S | Propuesto |

## 8. Pendientes de decisión ya abiertos

SCRUM-310, 326 (cupo 20 vs. máximo de negocio 15), 349, 351 y la rehabilitación de SCRUM-305. Restos parciales: SCRUM-240, 311, 313, 350, 329, 319.

---

## Registro de avance

- 15/10/2026: P-01 en PR #244 (región de las funciones). Gráficos de los cuatro portales y carga por secciones en PR #245 (P-05, P-06, P-07, G-01 a G-05, X-01 a X-03). Orden y paginación de listados, reporte de morosidad y tendencias en los reportes en PR #246 (T-01, T-02, R-02).
- Todas las consultas de analítica se probaron con la base real (sólo lecturas). Falta la verificación visual de cada panel en producción tras el deploy.
- P-02 (`getClaims` en el proxy) quedó sin hacer: el clasificador de seguridad lo bloqueó por tocar la verificación de login. Requiere una decisión explícita.
