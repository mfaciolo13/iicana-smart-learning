"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

function parseSchedule(value?: string) {
  if (!value) return { days: [] as string[], startTime: "", endTime: "" };
  const spaceIdx = value.lastIndexOf(" ");
  if (spaceIdx === -1) return { days: [], startTime: "", endTime: "" };
  const daysPart = value.slice(0, spaceIdx);
  const timesPart = value.slice(spaceIdx + 1);
  const days = daysPart.split("/").filter((d) => (DAYS as readonly string[]).includes(d));
  const sep = timesPart.includes("–") ? "–" : "-";
  const [start = "", end = ""] = timesPart.split(sep).map((t) => t.trim());
  return { days, startTime: start, endTime: end };
}

function composeSchedule(days: string[], startTime: string, endTime: string) {
  if (days.length === 0 || !startTime || !endTime) return "";
  return `${DAYS.filter((d) => days.includes(d)).join("/")} ${startTime}–${endTime}`;
}

interface SchedulePickerProps {
  defaultValue?: string;
}

export function SchedulePicker({ defaultValue }: SchedulePickerProps) {
  const parsed = parseSchedule(defaultValue);
  const [selectedDays, setSelectedDays] = useState<string[]>(parsed.days);
  const [startTime, setStartTime] = useState(parsed.startTime);
  const [endTime, setEndTime] = useState(parsed.endTime);

  const schedule = composeSchedule(selectedDays, startTime, endTime);

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : DAYS.filter((d) => [...prev, day].includes(d))
    );
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="schedule" value={schedule} required />

      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            aria-pressed={selectedDays.includes(day)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors select-none ${
              selectedDays.includes(day)
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-slate-800"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Desde</span>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Hasta</span>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-32"
          />
        </div>
        {schedule && (
          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-2 font-mono">
            {schedule}
          </span>
        )}
      </div>
    </div>
  );
}
