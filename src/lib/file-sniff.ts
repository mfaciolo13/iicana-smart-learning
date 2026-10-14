// SCRUM-302: el tipo de un archivo subido lo declara el navegador (`file.type`) y la extensión la
// elige el usuario: un HTML renombrado ".pdf" o ".png" se servía desde el bucket público. Acá se
// detecta el tipo real por los primeros bytes (magic bytes) y es el que se usa como contentType.

export type DetectedMime =
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "text/plain";

export const MIME_EXTENSION: Record<DetectedMime, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "text/plain": "txt",
};

const startsWith = (b: Uint8Array, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

export function detectMime(bytes: Uint8Array): DetectedMime | null {
  if (bytes.length < 4) return null;
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp"; // RIFF....WEBP
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "application/msword"; // OLE2
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // .docx es un zip: debe contener la entrada de Word (otros zip no se aceptan).
    const head = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 4096))).toString("latin1");
    return head.includes("word/") || head.includes("[Content_Types].xml") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : null;
  }
  // Texto plano: sin bytes nulos ni caracteres de control en la muestra y sin marcado HTML/script.
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  const isText = sample.every((b) => b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b !== 0x7f));
  if (isText) {
    const text = Buffer.from(sample).toString("utf-8").trimStart().toLowerCase();
    if (/^(<!doctype|<html|<script|<svg|<\?xml)/.test(text)) return null;
    return "text/plain";
  }
  return null;
}
