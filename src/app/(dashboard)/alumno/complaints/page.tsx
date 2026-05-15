import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { ComplaintList } from "@/modules/complaints/components/ComplaintList";
import { buttonVariants } from "@/components/ui/Button";
import type { ComplaintItem } from "@/modules/complaints/types";

export default async function AlumnoComplaintsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("complaints")
    .select("id, user_id, type, description, status, resolved_at, created_at, updated_at, profiles!user_id(full_name, role)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  type ProfileRaw = { full_name: string; role: string } | null;
  const myComplaints: ComplaintItem[] = (rows ?? []).map((c) => {
    const profile = c.profiles as unknown as ProfileRaw;
    return {
      id: c.id,
      userId: c.user_id,
      type: c.type as ComplaintItem["type"],
      description: c.description,
      status: c.status as ComplaintItem["status"],
      resolvedAt: c.resolved_at ? new Date(c.resolved_at) : null,
      createdAt: new Date(c.created_at),
      updatedAt: new Date(c.updated_at),
      authorName: profile?.full_name ?? "",
      authorRole: profile?.role ?? "",
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mis reclamos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {myComplaints.length} reclamo{myComplaints.length !== 1 ? "s" : ""} registrado{myComplaints.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/alumno/complaints/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo reclamo
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <ComplaintList complaints={myComplaints} newLink="/alumno/complaints/new" />
      </div>
    </div>
  );
}
