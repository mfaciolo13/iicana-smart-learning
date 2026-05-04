import { notFound } from "next/navigation";
import Link from "next/link";
import { getEnrollmentForCertificate } from "@/modules/promotions/services/promotions.service";
import { PrintButton } from "./PrintButton";
import { LEVEL_LABELS } from "@/lib/level-labels";

function certNumber(enrollmentId: string) {
  return "CERT-" + enrollmentId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = await params;
  const data = await getEnrollmentForCertificate(enrollmentId);

  if (!data) notFound();

  const completedDate = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  const levelLabel = LEVEL_LABELS[data.courseLevel] ?? data.courseLevel;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Link href="/admin/promotions" className="text-sm text-slate-400 hover:text-slate-600">
          ← Promociones
        </Link>
        <PrintButton />
      </div>

      {/* Certificate */}
      <div className="max-w-2xl mx-auto bg-white border-4 border-double border-slate-800 rounded-none p-12 print:shadow-none print:border-none print:p-10 shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-3">
            Smart Learning
          </p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-wide">
            Certificado de Promoción
          </h1>
          <div className="mt-3 mx-auto w-24 h-1 bg-slate-800 rounded" />
        </div>

        {/* Body */}
        <div className="text-center space-y-4 mb-8">
          <p className="text-sm text-slate-500">Por medio del presente, se certifica que</p>
          <p className="text-2xl font-bold text-slate-900">{data.studentName}</p>
          <p className="text-sm text-slate-500 font-mono">DNI {data.studentDni}</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            ha completado satisfactoriamente el curso
          </p>
          <p className="text-xl font-semibold text-slate-800">
            {data.courseName}{" "}
            <span className="text-base font-normal text-slate-500">— Nivel {levelLabel}</span>
          </p>
          <p className="text-sm text-slate-500">con fecha</p>
          <p className="text-base font-semibold text-slate-700">{completedDate}</p>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between mt-12 pt-6 border-t border-slate-200">
          <div className="text-center">
            <div className="w-32 border-b border-slate-400 mb-1" />
            <p className="text-xs text-slate-400">Firma y sello</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-slate-400">{certNumber(enrollmentId)}</p>
            <p className="text-xs text-slate-400 mt-0.5">N° de certificado</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">
          Documento generado por Smart Learning
        </p>
      </div>
    </div>
  );
}
