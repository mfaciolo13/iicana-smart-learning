import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthorizedCron } from "@/lib/cron-auth";

// SCRUM-282: invalida las listas cacheadas cuando los datos cambian por fuera de la app
// (seed, SQL manual). Se llama con `Authorization: Bearer $CRON_SECRET`, por ejemplo al final
// del seed. Sin cuerpo, invalida todas las etiquetas conocidas.
const KNOWN_TAGS = ["students", "teachers", "courses", "enrollments"] as const;

export async function POST(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requested: string[] = [];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body.tags)) requested = body.tags.filter((t): t is string => typeof t === "string");
  } catch {
    // sin cuerpo: se invalidan todas
  }

  const tags = requested.length > 0 ? requested.filter((t) => (KNOWN_TAGS as readonly string[]).includes(t)) : [...KNOWN_TAGS];
  for (const tag of tags) revalidateTag(tag, "max");

  return NextResponse.json({ revalidated: tags });
}
