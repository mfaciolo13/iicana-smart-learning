import { describe, it, expect } from "vitest";
import { pageWindow, paginate, parseTableQuery, sortRows, tableHref } from "@/lib/table";

const opts = { sortable: ["name", "dni"], defaultSort: "name" };

describe("parseTableQuery", () => {
  it("usa los valores por defecto y descarta campos no permitidos", () => {
    expect(parseTableQuery({}, opts)).toEqual({ sort: "name", dir: "asc", page: 1, pageSize: 25 });
    expect(parseTableQuery({ sort: "drop table", dir: "up", page: "-3" }, opts)).toEqual({ sort: "name", dir: "asc", page: 1, pageSize: 25 });
  });

  it("acepta orden, sentido y página válidos", () => {
    expect(parseTableQuery({ sort: "dni", dir: "desc", page: "4" }, { ...opts, pageSize: 10 })).toEqual({
      sort: "dni",
      dir: "desc",
      page: 4,
      pageSize: 10,
    });
  });
});

describe("sortRows", () => {
  const rows = [{ name: "Ñandú" }, { name: "álvaro" }, { name: "Beto" }, { name: null as string | null }];
  const acc = { name: (r: { name: string | null }) => r.name };

  it("ordena en español, sin distinguir acentos ni mayúsculas, con vacíos al final", () => {
    expect(sortRows(rows, { sort: "name", dir: "asc" }, acc).map((r) => r.name)).toEqual(["álvaro", "Beto", "Ñandú", null]);
  });

  it("en sentido descendente los vacíos siguen al final", () => {
    expect(sortRows(rows, { sort: "name", dir: "desc" }, acc).map((r) => r.name)).toEqual(["Ñandú", "Beto", "álvaro", null]);
  });

  it("ordena números como números y no modifica el original", () => {
    const nums = [{ n: 10 }, { n: 9 }, { n: 100 }];
    expect(sortRows(nums, { sort: "n", dir: "asc" }, { n: (r) => r.n }).map((r) => r.n)).toEqual([9, 10, 100]);
    expect(nums.map((r) => r.n)).toEqual([10, 9, 100]);
  });
});

describe("paginate", () => {
  const rows = Array.from({ length: 53 }, (_, i) => i + 1);

  it("corta la página pedida y calcula el rango mostrado", () => {
    const p = paginate(rows, { page: 3, pageSize: 25 });
    expect(p.rows).toEqual([51, 52, 53]);
    expect(p).toMatchObject({ total: 53, page: 3, pageCount: 3, from: 51, to: 53 });
  });

  it("una página fuera de rango cae en la última", () => {
    expect(paginate(rows, { page: 99, pageSize: 25 }).page).toBe(3);
  });

  it("sin filas no hay rango", () => {
    expect(paginate([], { page: 1, pageSize: 25 })).toMatchObject({ total: 0, pageCount: 1, from: 0, to: 0 });
  });
});

describe("tableHref y pageWindow", () => {
  it("conserva los demás parámetros y quita los vacíos", () => {
    expect(tableHref("/director/students", { q: "ana", page: "3" }, { sort: "dni", page: undefined })).toBe("/director/students?q=ana&sort=dni");
    expect(tableHref("/x", {}, {})).toBe("/x");
  });

  it("muestra primera, última y la ventana de la actual con huecos", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, "…", 10]);
  });
});
