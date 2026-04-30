"use client";

import { useRef } from "react";
import type { StudentWithProfile } from "../types";

const LEVELS = [
  { value: "beginner", label: "Principiante" },
  { value: "elementary", label: "Elemental" },
  { value: "pre_intermediate", label: "Pre-intermedio" },
  { value: "intermediate", label: "Intermedio" },
  { value: "upper_intermediate", label: "Upper-intermedio" },
  { value: "advanced", label: "Avanzado" },
];

const STATUSES = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "suspended", label: "Suspendido" },
  { value: "graduated", label: "Egresado" },
];

interface StudentFormProps {
  student?: StudentWithProfile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<any>;
  submitLabel?: string;
}

export function StudentForm({
  student,
  action,
  submitLabel = "Guardar",
}: StudentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = !!student;

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={student.id} />}

      {/* Personal data */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Datos personales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombre completo *
            </label>
            <input
              name="fullName"
              type="text"
              required
              defaultValue={student?.profile.fullName}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              DNI *
            </label>
            <input
              name="dni"
              type="text"
              required
              minLength={7}
              maxLength={8}
              defaultValue={student?.dni}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email *
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Teléfono
            </label>
            <input
              name="phone"
              type="tel"
              defaultValue={student?.profile.phone ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha de nacimiento *
            </label>
            <input
              name="birthDate"
              type="date"
              required={!isEditing}
              defaultValue={student?.birthDate}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Academic data */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">
          Datos académicos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nivel
            </label>
            <select
              name="level"
              defaultValue={student?.level ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin asignar</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Estado
              </label>
              <select
                name="status"
                defaultValue={student?.status}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a
          href="/admin/students"
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </a>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
