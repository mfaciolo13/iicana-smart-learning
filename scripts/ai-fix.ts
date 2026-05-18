/**
 * Agente de auto-fix para fallos de E2E Daily.
 * Lee los logs del run fallido, consulta a Claude, y aplica los fixes en los tests.
 * Corre desde GitHub Actions — ver .github/workflows/ai-fix.yml
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const REPO = "mfaciolo13/iicana-smart-learning";
const GH_TOKEN = process.env.GITHUB_TOKEN!;
const FAILED_RUN_ID = process.env.FAILED_RUN_ID!;

const E2E_TEST_FILES = [
  "tests/e2e/auth.setup.ts",
  "tests/e2e/auth.spec.ts",
  "tests/e2e/students.spec.ts",
  "tests/e2e/courses.spec.ts",
  "tests/e2e/payments.spec.ts",
  "tests/e2e/enrollments.spec.ts",
  "tests/e2e/notifications.spec.ts",
  "tests/e2e/marketing.spec.ts",
  "tests/e2e/student-portal.spec.ts",
  "playwright.config.ts",
];

async function ghFetch(path: string) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${path}`);
  return res;
}

async function getFailureLogs(): Promise<string> {
  const jobs = await (await ghFetch(`/actions/runs/${FAILED_RUN_ID}/jobs`)).json() as any;
  let logs = "";
  for (const job of jobs.jobs ?? []) {
    if (job.conclusion !== "failure") continue;
    const raw = await (await ghFetch(`/actions/jobs/${job.id}/logs`)).text();
    // Filtramos solo las líneas con errores para no sobrepasar el contexto
    const errorLines = raw
      .split("\n")
      .filter((l: string) => /error|Error|ERROR|fail|FAIL|✘|×/i.test(l))
      .slice(0, 200)
      .join("\n");
    logs += `\n=== JOB: ${job.name} ===\n${errorLines}\n`;
  }
  return logs || "No se encontraron líneas de error en los logs.";
}

function readTestFiles(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const file of E2E_TEST_FILES) {
    try {
      result[file] = readFileSync(file, "utf-8");
    } catch {
      // archivo no existe, skip
    }
  }
  return result;
}

async function main() {
  if (!FAILED_RUN_ID) {
    console.error("FAILED_RUN_ID no está seteado.");
    process.exit(1);
  }

  console.log(`Obteniendo logs del run ${FAILED_RUN_ID}...`);
  const logs = await getFailureLogs();
  console.log(`Logs obtenidos (${logs.length} chars)`);

  const testFiles = readTestFiles();
  const filesContext = Object.entries(testFiles)
    .map(([path, content]) => `### ${path}\n\`\`\`typescript\n${content}\n\`\`\``)
    .join("\n\n");

  const client = new Anthropic();
  const changedFiles: Record<string, string> = {};

  console.log("Consultando Claude para el fix...");

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8096,
    tools: [
      {
        name: "write_file",
        description: "Escribe el contenido corregido de un archivo de test E2E. Solo se permite modificar archivos dentro de tests/e2e/ y playwright.config.ts.",
        input_schema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Ruta relativa del archivo (ej: tests/e2e/auth.setup.ts)",
            },
            content: {
              type: "string",
              description: "Contenido completo del archivo con el fix aplicado",
            },
            reason: {
              type: "string",
              description: "Explicación concisa del fix en una línea",
            },
          },
          required: ["path", "content", "reason"],
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Sos un agente que arregla tests E2E de Playwright que fallaron en CI.

## Contexto del proyecto
- Next.js app deployada en https://cervantes-smart-learning.com.ar
- Los tests corren contra producción (PLAYWRIGHT_BASE_URL apunta a prod)
- Los tests deben ser read-only salvo que estén marcados con test.skip(!!process.env.CI)
- Solo podés modificar archivos en tests/e2e/ y playwright.config.ts

## Logs del fallo
\`\`\`
${logs}
\`\`\`

## Archivos de tests actuales
${filesContext}

Analizá los errores. Para cada archivo que necesite fix, usá write_file con el contenido corregido completo. Si el error no tiene fix claro en los tests (por ejemplo, es un error de la app en producción), no modifiques nada.`,
      },
    ],
  });

  for (const block of response.content) {
    if (block.type !== "tool_use" || block.name !== "write_file") continue;
    const input = block.input as { path: string; content: string; reason: string };

    // Validación de seguridad: solo tests
    if (!input.path.startsWith("tests/e2e/") && input.path !== "playwright.config.ts") {
      console.warn(`Claude intentó modificar ${input.path} — ignorado (fuera de scope)`);
      continue;
    }

    console.log(`Aplicando fix en ${input.path}: ${input.reason}`);
    writeFileSync(input.path, input.content, "utf-8");
    changedFiles[input.path] = input.reason;
  }

  if (Object.keys(changedFiles).length === 0) {
    console.log("Claude no encontró fixes aplicables en los tests. El fallo puede ser de la app en producción.");
    process.exit(0);
  }

  // Crear branch y PR
  const branch = `fix/ai-e2e-${FAILED_RUN_ID}`;
  const changedList = Object.entries(changedFiles)
    .map(([f, r]) => `- \`${f}\`: ${r}`)
    .join("\n");

  execSync('git config user.name "github-actions[bot]"');
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
  execSync(`git checkout -b ${branch}`);
  execSync(`git add ${Object.keys(changedFiles).join(" ")}`);
  execSync(`git commit -m "fix(e2e): auto-fix de tests E2E via Claude AI\n\n${changedList}"`);
  execSync(`git push origin ${branch}`);

  const prRes = await fetch(`https://api.github.com/repos/${REPO}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "fix(e2e): auto-fix de tests E2E via Claude AI",
      body: `## Fixes automáticos generados por Claude Opus

El workflow **E2E Daily** falló en el run [#${FAILED_RUN_ID}](https://github.com/${REPO}/actions/runs/${FAILED_RUN_ID}).

Claude analizó los logs y aplicó los siguientes fixes:

${changedList}

---
> ⚠️ Revisá los cambios antes de mergear — Claude puede equivocarse.
> *Generado por el workflow [AI Fix](https://github.com/${REPO}/actions/workflows/ai-fix.yml)*`,
      head: branch,
      base: "main",
    }),
  });

  const pr = await prRes.json() as any;
  if (pr.html_url) {
    console.log(`✓ PR creado: ${pr.html_url}`);
  } else {
    console.error("Error creando PR:", JSON.stringify(pr));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error en ai-fix:", err.message);
  process.exit(1);
});
