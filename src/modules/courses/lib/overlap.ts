const LABEL_TO_INDEX: Record<string, number> = { Lun: 0, Mar: 1, "Mié": 2, Mie: 2, Jue: 3, Vie: 4, "Sáb": 5, Sab: 5, Dom: 6 };
const WEEK = 7 * 1440;

export interface ParsedSchedule {
  /** Índices de día (0 = lunes). */
  days: number[];
  /** Minutos desde las 00:00 del día de inicio. */
  start: number;
  /** Duración en minutos; una clase que cruza la medianoche dura más allá de las 24 h del día de inicio. */
  duration: number;
}

/** "Lun/Mié 18:00–19:30" → días, inicio y duración. Null si no se puede interpretar. */
export function parseSchedule(schedule: string): ParsedSchedule | null {
  const spaceIdx = schedule.lastIndexOf(" ");
  if (spaceIdx === -1) return null;
  const days = schedule
    .slice(0, spaceIdx)
    .split("/")
    .map((d) => LABEL_TO_INDEX[d.trim()])
    .filter((d): d is number => d !== undefined);
  const timesPart = schedule.slice(spaceIdx + 1);
  const parts = timesPart.split(timesPart.includes("–") ? "–" : "-").map((t) => t.trim());
  if (parts.length !== 2 || days.length === 0) return null;
  const toMin = (t: string) => {
    const [h = "0", m = "0"] = t.split(":");
    return parseInt(h) * 60 + parseInt(m);
  };
  const start = toMin(parts[0]);
  const end = toMin(parts[1]);
  if ([start, end].some(Number.isNaN)) return null;
  // Si el fin es anterior (o igual) al inicio, la clase termina después de la medianoche.
  const duration = end > start ? end - start : end + 1440 - start;
  return { days, start, duration };
}

/**
 * ¿Se superponen dos horarios? Se comparan sobre la semana completa (y con el empalme domingo→lunes),
 * así una clase "Lun 23:00–02:00" también choca con una del martes a la 1:00. Antes la comparación
 * usaba minutos del día y, si el fin pasaba la medianoche, el control de superposición se desactivaba.
 */
export function schedulesOverlap(a: string, b: string): boolean {
  const pa = parseSchedule(a);
  const pb = parseSchedule(b);
  if (!pa || !pb) return false;
  for (const da of pa.days) {
    for (const db of pb.days) {
      const aStart = da * 1440 + pa.start;
      const bStart = db * 1440 + pb.start;
      for (const shift of [-WEEK, 0, WEEK]) {
        if (aStart < bStart + shift + pb.duration && bStart + shift < aStart + pa.duration) return true;
      }
    }
  }
  return false;
}
