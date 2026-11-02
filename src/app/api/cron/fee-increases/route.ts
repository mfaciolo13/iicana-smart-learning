import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { applyDueIncreases } from "@/modules/payments/services/fee-increases.service";
import { revalidatePath } from "next/cache";

export const maxDuration = 60;

/**
 * Aplica los aumentos trimestrales programados cuya vigencia llegó. Corre solo, todos los días:
 * no depende de que alguien abra la pantalla. Es idempotente, así que una ejecución repetida no
 * duplica ningún incremento.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const applied = await applyDueIncreases();
  if (applied.length > 0) {
    for (const base of ["/director", "/administrativo", "/alumno"]) revalidatePath(`${base}/payments`);
    revalidatePath("/director/settings/fee-increases");
  }
  return NextResponse.json({ applied });
}
