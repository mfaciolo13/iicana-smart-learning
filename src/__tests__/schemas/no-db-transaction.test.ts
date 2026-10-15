import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("transacciones de Drizzle (SCRUM-270)", () => {
  it("db.transaction falla en producción con max_pipeline: 0; hay que usar dbTx.transaction", () => {
    const offenders = walk(join(process.cwd(), "src")).filter((f) =>
      /(?<![A-Za-z])db\.transaction\(/.test(readFileSync(f, "utf8").replace(/\/\/.*$/gm, ""))
    );
    expect(offenders).toEqual([]);
  });
});
