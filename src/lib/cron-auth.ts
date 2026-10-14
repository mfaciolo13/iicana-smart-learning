import { timingSafeEqual } from "node:crypto";

/**
 * Autoriza una llamada a un endpoint de cron (SCRUM-271). Exige CRON_SECRET en TODOS los
 * entornos: antes, en desarrollo no se pedía nada y, en producción, si la variable faltaba
 * el valor esperado era "Bearer undefined", que cualquiera podía enviar.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
