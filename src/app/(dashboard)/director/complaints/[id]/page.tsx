import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/helpers";
import { getComplaintById } from "@/modules/complaints/services/complaints.service";
import { updateComplaintStatusAction } from "@/modules/complaints/actions";
import { ComplaintStatusForm } from "@/modules/complaints/components/ComplaintStatusForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const TYPE_LABELS: Record<string, string> = {
  academic: "Académico",
  administrative: "Administrativo",
  infrastructure: "Infraestructura",
  teacher: "Docente",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "info" | "success" | "neutral" }> = {
  open: { label: "Abierto", variant: "warning" },
  in_progress: { label: "En proceso", variant: "info" },
  resolved: { label: "Resuelto", variant: "success" },
  closed: { label: "Cerrado", variant: "neutral" },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROLE_LABELS: Record<string, string> = {
  director: "Director",
  administrativo: "Administrativo",
  profesor: "Docente",
  alumno: "Alumno",
};

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireRole(["director", "administrativo"]);
  // Lectura por Drizzle tras validar el rol: con el JWT del usuario, RLS devolvía 404 (SCRUM-272).
  const complaint = UUID_RE.test(id) ? await getComplaintById(id) : null;
  if (!complaint) notFound();

  const statusCfg = STATUS_CONFIG[complaint.status] ?? { label: complaint.status, variant: "neutral" as const };
  const isResolvable = complaint.status === "open" || complaint.status === "in_progress";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/director/complaints" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Reclamos
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">
            Reclamo — {TYPE_LABELS[complaint.type] ?? complaint.type}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {complaint.authorName} · {ROLE_LABELS[complaint.authorRole] ?? complaint.authorRole}
          </p>
        </div>
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Descripción del reclamo" padding="md">
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {complaint.description}
            </p>
          </Card>

          <Card title="Información" padding="md">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Categoría</dt>
                <dd className="font-semibold text-slate-900">{TYPE_LABELS[complaint.type] ?? complaint.type}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Estado</dt>
                <dd><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Recibido</dt>
                <dd className="text-slate-700">{new Date(complaint.createdAt).toLocaleDateString("es-AR")}</dd>
              </div>
              {complaint.resolvedAt && (
                <div>
                  <dt className="text-slate-400 font-medium mb-0.5">Resuelto</dt>
                  <dd className="text-slate-700">{new Date(complaint.resolvedAt).toLocaleDateString("es-AR")}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Autor" padding="md">
            <p className="text-sm font-semibold text-slate-900">{complaint.authorName}</p>
            <p className="text-xs text-slate-400 mt-0.5">{ROLE_LABELS[complaint.authorRole] ?? complaint.authorRole}</p>
          </Card>

          {isResolvable && (
            <ComplaintStatusForm
              complaintId={complaint.id}
              currentStatus={complaint.status}
              action={updateComplaintStatusAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}
