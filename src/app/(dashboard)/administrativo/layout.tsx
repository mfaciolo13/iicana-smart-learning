import { redirect } from "next/navigation";
import { getServerProfile } from "@/lib/auth/helpers";
import type { ReactNode } from "react";

export default async function AdministrativoLayout({ children }: { children: ReactNode }) {
  const profile = await getServerProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "administrativo") redirect(`/${profile.role}`);
  return <>{children}</>;
}
