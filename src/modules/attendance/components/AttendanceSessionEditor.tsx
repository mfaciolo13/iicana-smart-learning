import { Badge } from "@/components/ui/Badge";
import { FormButton } from "@/components/ui/FormButton";
import { AttendanceTaker } from "./AttendanceTaker";
import { updateAttendanceAction, deleteAttendanceSessionAction } from "../actions";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import { formatDateAR } from "@/lib/format";

interface AttendanceSessionEditorProps {
  /** Inscripciones del curso — se filtran a las que tienen registro en esta fecha. */
  enrollments: EnrollmentListItem[];
  /** Registros ya cargados para el curso y la fecha. */
  existingRecords: Array<{ enrollmentId: string; status: string }>;
  courseId: string;
  classDate: string;
  redirectTo: string;
}

/**
 * Corrección de una toma de lista ya registrada: permite cambiar el estado de cada
 * alumno o eliminar la sesión completa.
 *
 * Se muestran únicamente los alumnos que tienen un registro en esa fecha. Un alumno
 * inscripto después de la clase no aparece: no se le puede asignar retroactivamente
 * una asistencia a una clase en la que no estaba inscripto.
 */
export function AttendanceSessionEditor({
  enrollments,
  existingRecords,
  courseId,
  classDate,
  redirectTo,
}: AttendanceSessionEditorProps) {
  const statusByEnrollment = Object.fromEntries(
    existingRecords.map((r) => [r.enrollmentId, r.status])
  );
  const recordedEnrollments = enrollments.filter((e) => e.id in statusByEnrollment);
  const formattedDate = formatDateAR(classDate);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-slate-900">Asistencia del {formattedDate}</h3>
        <Badge variant="info" dot={false}>Ya registrada</Badge>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Podés corregir el estado de cada alumno. La corrección queda registrada con tu usuario y la fecha.
      </p>

      <AttendanceTaker
        enrollments={recordedEnrollments}
        courseId={courseId}
        classDate={classDate}
        action={updateAttendanceAction}
        redirectTo={redirectTo}
        initialStatuses={statusByEnrollment}
        submitLabel={`Guardar corrección (${recordedEnrollments.length} alumnos)`}
      />

      <div className="flex items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          ¿La clase no se dictó o la cargaste en el curso equivocado? Eliminá la toma de lista completa.
        </p>
        <FormButton
          action={deleteAttendanceSessionAction}
          fields={{ courseId, classDate, redirectTo }}
          variant="danger"
          size="sm"
          confirmMessage={`Se eliminarán los ${recordedEnrollments.length} registros de asistencia del ${formattedDate}. Esta acción no se puede deshacer.`}
        >
          Eliminar asistencia
        </FormButton>
      </div>
    </div>
  );
}
