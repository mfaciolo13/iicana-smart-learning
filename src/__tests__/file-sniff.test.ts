import { describe, it, expect } from "vitest";
import { detectMime } from "@/lib/file-sniff";

// SCRUM-302: el tipo de archivo se detecta por contenido, no por extensión ni contentType declarado

const bytes = (...b: number[]) => new Uint8Array(b);
const text = (s: string) => new Uint8Array(Buffer.from(s, "utf-8"));

describe("detectMime", () => {
  it("reconoce PDF, PNG, JPEG y WebP por sus primeros bytes", () => {
    expect(detectMime(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31))).toBe("application/pdf");
    expect(detectMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(detectMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0))).toBe("image/jpeg");
    expect(detectMime(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
  });

  it("reconoce .doc (OLE2) y .docx (zip con entradas de Word)", () => {
    expect(detectMime(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe("application/msword");
    const docx = new Uint8Array(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....word/document.xml")]));
    expect(detectMime(docx)).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });

  it("acepta texto plano", () => {
    expect(detectMime(text("Hola, esto es un apunte.\nSegunda línea."))).toBe("text/plain");
  });

  it("rechaza un HTML renombrado como .pdf o .png", () => {
    expect(detectMime(text("<!DOCTYPE html><html><script>alert(1)</script></html>"))).toBeNull();
    expect(detectMime(text("<script>alert(1)</script>"))).toBeNull();
    expect(detectMime(text("<svg onload=alert(1)></svg>"))).toBeNull();
  });

  it("rechaza binarios desconocidos y un zip que no es Word", () => {
    expect(detectMime(bytes(0x7f, 0x45, 0x4c, 0x46, 0, 1, 2, 3))).toBeNull();
    const zip = new Uint8Array(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....malware.exe")]));
    expect(detectMime(zip)).toBeNull();
  });

  it("rechaza contenido demasiado corto", () => {
    expect(detectMime(bytes(1, 2))).toBeNull();
  });
});
