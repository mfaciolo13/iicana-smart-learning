import { updateTag } from "next/cache";

/** Tag común de las consultas de analítica cacheadas (paneles de gráficos). */
export const ANALYTICS_TAG = "analytics";

/**
 * Invalida el caché de los gráficos. Llamar desde las Server Actions que cambian datos que los
 * gráficos muestran (asistencia, notas, pagos, inscripciones, reclamos...), así quien acaba de
 * guardar ve su cambio de inmediato en vez de esperar al vencimiento del caché.
 */
export function refreshAnalytics(): void {
  updateTag(ANALYTICS_TAG);
}
