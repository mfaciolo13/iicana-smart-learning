import type { DayOfWeek } from "../types";

export const DAY_OF_WEEK_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies readonly DayOfWeek[];

export const DAY_LABELS_ES: Record<DayOfWeek, string> = {
  monday: "Lun",
  tuesday: "Mar",
  wednesday: "Mié",
  thursday: "Jue",
  friday: "Vie",
  saturday: "Sáb",
  sunday: "Dom",
};

// El instituto no dicta clases los domingos
export const SELECTABLE_DAYS = DAY_OF_WEEK_VALUES.filter((d) => d !== "sunday");

export const DURATION_OPTIONS = [45, 60, 90, 120, 150, 180];

export function formatSchedule(
  classDays: DayOfWeek[],
  classTime: string,
  classDurationMinutes: number
): string {
  if (classDays.length === 0 || !classTime) return "";
  const days = DAY_OF_WEEK_VALUES.filter((d) => classDays.includes(d))
    .map((d) => DAY_LABELS_ES[d])
    .join("/");
  const start = classTime.slice(0, 5);
  const [h, m] = start.split(":").map(Number);
  const endMinutes = h * 60 + m + classDurationMinutes;
  const end = `${String(Math.floor((endMinutes % 1440) / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  return `${days} ${start}–${end}`;
}
