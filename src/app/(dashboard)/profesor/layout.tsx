import { redirect } from "next/navigation";
import { getServerProfile } from "@/lib/auth/helpers";
import type { ReactNode } from "react";

export default async function ProfesorLayout({ children }: { children: ReactNode }) {
  const profile = await getServerProfile(); // cache hit — already fetched by dashboard layout

  if (!profile) redirect("/login");
  if (profile.role !== "profesor") redirect(`/${profile.role}`);

  return <>{children}</>;
}
