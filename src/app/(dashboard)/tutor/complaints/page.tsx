import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerUser } from "@/lib/auth/helpers";
import { getMyComplaints } from "@/modules/complaints/services/complaints.service";
import { ComplaintList } from "@/modules/complaints/components/ComplaintList";
import { buttonVariants } from "@/components/ui/Button";

export default async function TutorComplaintsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const myComplaints = await getMyComplaints(user.id);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mis reclamos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {myComplaints.length} reclamo{myComplaints.length !== 1 ? "s" : ""} registrado{myComplaints.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/tutor/complaints/new" className={buttonVariants({ variant: "primary" })}>
          + Nuevo reclamo
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <ComplaintList complaints={myComplaints} newLink="/tutor/complaints/new" />
      </div>
    </div>
  );
}
