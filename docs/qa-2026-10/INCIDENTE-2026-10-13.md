# Incidente: borrado de una alumna real en producción durante el QA (13/10/2026)

**Estado:** abierto. La alumna está pendiente de restauración.

## Qué pasó

Durante la segunda pasada de QA #1, un script de Playwright creó un alumno de prueba y lo buscó por DNI en `/director/students`. Después abrió "la primera fila" de la tabla. El buscador no filtró la tabla (QA1-024), así que la primera fila era una **alumna real**. Sobre ese registro el script:

1. **Editó** sus datos. Apareció el toast "Alumno actualizado", pero el cambio no se guardó (SCRUM-242 / DEV-017), así que los datos quedaron como estaban.
2. **La eliminó y confirmó la eliminación.** Es un borrado duro con `ON DELETE CASCADE`.

La base de dev/test es la de producción (DEV-005), así que el borrado ocurrió en producción.

## Impacto

| Dato | Estado |
|---|---|
| Fila en `students` (id `9a444b3f-e679-41fa-93c2-5f26ffb11b48`) | **Borrada** |
| 1 pago en estado PAGADO, de $15.000 (vencimiento 10/05/2026, pagado el 03/05/2026, por transferencia; id probable `36ea1b5b-8858-4ead-ba29-db2426321dfe`) | **Borrado en cascada** |
| Inscripciones, asistencia y notas | No tenía, no se perdió nada |
| `profiles` y usuario de Supabase Auth | Siguen existiendo, ahora huérfanos (sin fila en `students`) |

Los datos personales de la alumna **no** están en este documento. Los que hacen falta para restaurarla están solo en el scratchpad local de QA #1 (`qa1/shots/crud-detail.png` y la exportación de pagos), fuera del repo.

## Restauración (pendiente, la decide el responsable del proyecto)

Opciones, de la preferida a la última:

1. **Backup o PITR de Supabase** (Dashboard → Database → Backups). Con el plan Pro hay backups diarios, y PITR si está habilitado. Conviene restaurar solo las filas afectadas en un proyecto aparte y copiarlas, no pisar la base entera, porque desde entonces hubo otras escrituras.
2. **Reinsert manual** con el mismo `id` y el mismo `profile_id` en `students`, y el pago con su `id`, su `receipt_number` y sus fechas originales, a partir de la evidencia guardada. Algunos campos (por ejemplo `created_at` y `placement_test_score`) podrían no recuperarse exactos.
3. **No** recrearla desde la UI: generaría un usuario nuevo y le mandaría una invitación por email a la persona real.

Después de restaurar, verificar que la alumna pueda entrar a su portal y que el pago aparezca en `/director/payments` y en los reportes.

## Causas

- **Inmediata:** el script eligió una fila por posición en vez de abrir el registro recién creado por su id.
- **Del producto:**
  - QA1-024: el buscador de alumnos no filtra.
  - QA1-023 / BA-005 / DEV-019: el borrado es duro y en cascada, contra la decisión D-02 ("anulación, no eliminación"), y la confirmación es genérica.
- **De infraestructura:** DEV-005, dev y test usan la base de producción. Con una base de test separada esto no habría pasado.

## Acciones tomadas

- Se frenaron todas las pruebas de escritura de los dos QA. QA #2 sigue en modo solo lectura y tiene que confirmar que ninguna de sus mutaciones cayó sobre datos reales.
- No se intentó ninguna restauración sin autorización.

## Acciones preventivas (para el backlog)

1. Separar el proyecto Supabase de test del de producción (DEV-005): bloqueante para cualquier campaña QA futura.
2. Pasar a borrado lógico o baja de alumnos, y prohibir el borrado de alumnos con pagos (QA1-023).
3. Que la confirmación de borrado nombre al alumno y diga el impacto.
4. Arreglar el buscador de alumnos (QA1-024).
