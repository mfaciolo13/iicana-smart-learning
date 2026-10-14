"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/Input";
import type { DayOfWeek } from "../types";
import { DAY_LABELS_ES, SELECTABLE_DAYS, DURATION_OPTIONS, formatSchedule } from "../lib/schedule";

export interface ScheduleValue {
  days: DayOfWeek[];
  time: string;
  duration: number;
}

interface SchedulePickerProps {
  defaultDays?: DayOfWeek[];
  defaultTime?: string;
  defaultDuration?: number;
  /** Notifica cada cambio para que el formulario padre (react-hook-form) valide los mismos valores que se envían. */
  onChange?: (value: ScheduleValue) => void;
}

export function SchedulePicker({ defaultDays = [], defaultTime = "", defaultDuration = 90, onChange }: SchedulePickerProps) {
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(defaultDays);
  const [time, setTime] = useState(defaultTime.slice(0, 5));
  const [duration, setDuration] = useState(defaultDuration);

  const preview = formatSchedule(selectedDays, time, duration);

  function toggleDay(day: DayOfWeek) {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : SELECTABLE_DAYS.filter((d) => [...selectedDays, day].includes(d));
    setSelectedDays(next);
    onChange?.({ days: next, time, duration });
  }

  function changeTime(value: string) {
    setTime(value);
    onChange?.({ days: selectedDays, time: value, duration });
  }

  function changeDuration(value: number) {
    setDuration(value);
    onChange?.({ days: selectedDays, time, duration: value });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="classDays" value={selectedDays.join(",")} />

      <div className="flex flex-wrap gap-2">
        {SELECTABLE_DAYS.map((day) => (
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
            {DAY_LABELS_ES[day]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Hora de inicio</span>
          <Input
            type="time"
            name="classTime"
            value={time}
            onChange={(e) => changeTime(e.target.value)}
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-400">Duración</span>
          <Select
            name="classDurationMinutes"
            value={duration}
            onChange={(e) => changeDuration(Number(e.target.value))}
            className="w-32"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </Select>
        </div>
        {preview && (
          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-2 font-mono">
            {preview}
          </span>
        )}
      </div>
    </div>
  );
}
