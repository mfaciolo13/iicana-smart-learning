import forge from "node-forge";

/**
 * Cliente de facturación electrónica de ARCA (ex AFIP): autenticación WSAA y Web Service de
 * Factura Electrónica WSFEv1, para emitir Factura C (código 11).
 *
 *   ARCA_ENV               "homologacion" (por defecto) | "produccion"
 *   ARCA_CUIT              CUIT del emisor, sin guiones
 *   ARCA_PTO_VTA           punto de venta habilitado para "Factura Electrónica - Web Services"
 *   ARCA_CERT              certificado X.509 en PEM (admite "\n" escapados)
 *   ARCA_PRIVATE_KEY       clave privada en PEM (admite "\n" escapados)
 *   ARCA_RAZON_SOCIAL, ARCA_DOMICILIO, ARCA_INICIO_ACTIVIDADES, ARCA_INGRESOS_BRUTOS, ARCA_CONDICION_IVA
 *                          datos del emisor que se imprimen en la factura
 *
 * Los certificados y claves nunca se loguean ni se guardan en la base.
 */

export const CBTE_TIPO_FACTURA_C = 11;
/** Consumidor Final como condición frente al IVA del receptor (RG 5616). */
export const COND_IVA_CONSUMIDOR_FINAL = 5;
export const DOC_TIPO_DNI = 96;

const ENDPOINTS = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
} as const;

const REQUEST_TIMEOUT_MS = 30_000;

export interface ArcaConfig {
  env: "homologacion" | "produccion";
  cuit: string;
  ptoVta: number;
  certPem: string;
  keyPem: string;
  issuer: {
    razonSocial: string;
    domicilio: string;
    inicioActividades: string;
    ingresosBrutos: string;
    condicionIva: string;
  };
}

const unescapePem = (v: string) => v.replace(/\\n/g, "\n").trim();

/** Lee la configuración fiscal del entorno; null si falta algún dato imprescindible. */
export function getArcaConfig(): ArcaConfig | null {
  const cuit = process.env.ARCA_CUIT?.replace(/\D/g, "");
  const ptoVta = Number(process.env.ARCA_PTO_VTA);
  const cert = process.env.ARCA_CERT;
  const key = process.env.ARCA_PRIVATE_KEY;
  if (!cuit || cuit.length !== 11 || !Number.isInteger(ptoVta) || ptoVta < 1 || !cert || !key) return null;
  return {
    env: process.env.ARCA_ENV?.trim() === "produccion" ? "produccion" : "homologacion",
    cuit,
    ptoVta,
    certPem: unescapePem(cert),
    keyPem: unescapePem(key),
    issuer: {
      razonSocial: process.env.ARCA_RAZON_SOCIAL?.trim() || "—",
      domicilio: process.env.ARCA_DOMICILIO?.trim() || "—",
      inicioActividades: process.env.ARCA_INICIO_ACTIVIDADES?.trim() || "—",
      ingresosBrutos: process.env.ARCA_INGRESOS_BRUTOS?.trim() || "—",
      condicionIva: process.env.ARCA_CONDICION_IVA?.trim() || "Responsable Monotributo",
    },
  };
}

export class ArcaError extends Error {
  constructor(
    message: string,
    /** Falla transitoria (red, servicio caído): se puede reintentar sin riesgo. */
    readonly retryable = true,
  ) {
    super(message);
  }
}

// ─── Puros (testeables) ─────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO con offset fijo -03:00 (Argentina no tiene horario de verano). */
function isoArgentina(d: Date): string {
  const a = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return `${a.getUTCFullYear()}-${pad(a.getUTCMonth() + 1)}-${pad(a.getUTCDate())}T${pad(a.getUTCHours())}:${pad(a.getUTCMinutes())}:${pad(a.getUTCSeconds())}-03:00`;
}

/** Ticket de Requerimiento de Acceso (TRA) para el servicio `wsfe`. */
export function buildLoginTicketRequest(now: Date = new Date()): string {
  const from = new Date(now.getTime() - 10 * 60 * 1000);
  const to = new Date(now.getTime() + 10 * 60 * 1000);
  return `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId><generationTime>${isoArgentina(from)}</generationTime><expirationTime>${isoArgentina(to)}</expirationTime></header><service>wsfe</service></loginTicketRequest>`;
}

/** Firma el TRA con el certificado y la clave (CMS / PKCS#7 con el contenido incluido) y lo devuelve en base64. */
export function signLoginTicket(tra: string, certPem: string, keyPem: string): string {
  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign();
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

const xmlEscape = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const xmlUnescape = (v: string) =>
  v.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** Texto del primer elemento `<tag>` (ignora prefijos de namespace). */
export function xmlTag(xml: string, tag: string): string | null {
  const m = new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`).exec(xml);
  return m ? m[1].trim() : null;
}

/** Todos los bloques `<tag>...</tag>`. */
export function xmlTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1].trim());
}

export interface InvoiceRequest {
  cuit: string;
  ptoVta: number;
  /** Fecha de emisión YYYY-MM-DD. */
  date: string;
  number: number;
  totalCents: number;
  docTipo: number;
  docNro: string;
  /** Período del servicio (cuota) YYYY-MM-DD. */
  serviceFrom: string;
  serviceTo: string;
  dueDate: string;
}

const ymd = (iso: string) => iso.replace(/-/g, "");
const amount = (cents: number) => (cents / 100).toFixed(2);

function authBlock(cuit: string, token: string, sign: string) {
  return `<ar:Auth><ar:Token>${xmlEscape(token)}</ar:Token><ar:Sign>${xmlEscape(sign)}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>`;
}

const envelope = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/"><soapenv:Header/><soapenv:Body>${body}</soapenv:Body></soapenv:Envelope>`;

/**
 * Factura C: sin discriminación de IVA (ImpNeto = ImpTotal, ImpIVA = 0). Concepto 2 (servicios),
 * por eso lleva el período del servicio y la fecha de vencimiento del pago.
 */
export function buildCaeRequest(r: InvoiceRequest, token: string, sign: string): string {
  const total = amount(r.totalCents);
  return envelope(`<ar:FECAESolicitar>${authBlock(r.cuit, token, sign)}<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${r.ptoVta}</ar:PtoVta><ar:CbteTipo>${CBTE_TIPO_FACTURA_C}</ar:CbteTipo></ar:FeCabReq><ar:FeDetReq><ar:FECAEDetRequest><ar:Concepto>2</ar:Concepto><ar:DocTipo>${r.docTipo}</ar:DocTipo><ar:DocNro>${xmlEscape(r.docNro)}</ar:DocNro><ar:CbteDesde>${r.number}</ar:CbteDesde><ar:CbteHasta>${r.number}</ar:CbteHasta><ar:CbteFch>${ymd(r.date)}</ar:CbteFch><ar:ImpTotal>${total}</ar:ImpTotal><ar:ImpTotConc>0.00</ar:ImpTotConc><ar:ImpNeto>${total}</ar:ImpNeto><ar:ImpOpEx>0.00</ar:ImpOpEx><ar:ImpTrib>0.00</ar:ImpTrib><ar:ImpIVA>0.00</ar:ImpIVA><ar:FchServDesde>${ymd(r.serviceFrom)}</ar:FchServDesde><ar:FchServHasta>${ymd(r.serviceTo)}</ar:FchServHasta><ar:FchVtoPago>${ymd(r.dueDate)}</ar:FchVtoPago><ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz><ar:CondicionIVAReceptorId>${COND_IVA_CONSUMIDOR_FINAL}</ar:CondicionIVAReceptorId></ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq></ar:FECAESolicitar>`);
}

export function buildLastAuthorizedRequest(cuit: string, ptoVta: number, token: string, sign: string): string {
  return envelope(`<ar:FECompUltimoAutorizado>${authBlock(cuit, token, sign)}<ar:PtoVta>${ptoVta}</ar:PtoVta><ar:CbteTipo>${CBTE_TIPO_FACTURA_C}</ar:CbteTipo></ar:FECompUltimoAutorizado>`);
}

export function buildConsultRequest(cuit: string, ptoVta: number, number: number, token: string, sign: string): string {
  return envelope(`<ar:FECompConsultar>${authBlock(cuit, token, sign)}<ar:FeCompConsReq><ar:CbteTipo>${CBTE_TIPO_FACTURA_C}</ar:CbteTipo><ar:CbteNro>${number}</ar:CbteNro><ar:PtoVta>${ptoVta}</ar:PtoVta></ar:FeCompConsReq></ar:FECompConsultar>`);
}

export interface CaeResult {
  approved: boolean;
  cae: string | null;
  /** Vencimiento del CAE YYYY-MM-DD. */
  caeExpiration: string | null;
  number: number | null;
  observations: string[];
  errors: string[];
}

const fromYmd = (v: string | null) => (v && /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null);

/** Interpreta la respuesta de FECAESolicitar. Resultado "A" = aprobado; cualquier otro, rechazado. */
export function parseCaeResponse(xml: string): CaeResult {
  const resultado = xmlTag(xml, "Resultado");
  const messages = (container: string, item: string) =>
    xmlTags(xmlTag(xml, container) ?? "", item).map((b) => `${xmlTag(b, "Code") ?? "?"}: ${xmlUnescape(xmlTag(b, "Msg") ?? "")}`);
  const cae = xmlTag(xml, "CAE");
  const nro = xmlTag(xml, "CbteDesde");
  return {
    approved: resultado === "A" && Boolean(cae && /^\d{14}$/.test(cae)),
    cae: cae && /^\d{14}$/.test(cae) ? cae : null,
    caeExpiration: fromYmd(xmlTag(xml, "CAEFchVto")),
    number: nro ? Number(nro) : null,
    observations: messages("Observaciones", "Obs"),
    errors: messages("Errors", "Err"),
  };
}

export function parseLastAuthorized(xml: string): number {
  const n = xmlTag(xml, "CbteNro");
  const errors = xmlTags(xmlTag(xml, "Errors") ?? "", "Err").map((b) => xmlUnescape(xmlTag(b, "Msg") ?? ""));
  if (n === null || errors.length > 0) throw new ArcaError(`ARCA no informó el último comprobante: ${errors.join("; ") || "respuesta vacía"}`);
  return Number(n);
}

/** Respuesta de FECompConsultar: el comprobante si existe (con su importe y CAE), null si no. */
export function parseConsult(xml: string): { cae: string; caeExpiration: string | null; totalCents: number; docNro: string } | null {
  const body = xmlTag(xml, "ResultGet");
  const cae = body ? xmlTag(body, "CodAutorizacion") : null;
  if (!body || !cae) return null;
  const total = xmlTag(body, "ImpTotal") ?? "0";
  return {
    cae,
    caeExpiration: fromYmd(xmlTag(body, "FchVto")),
    totalCents: Math.round(Number(total) * 100),
    docNro: xmlTag(body, "DocNro") ?? "",
  };
}

/** Texto del fallo SOAP (`faultstring`), sin datos sensibles. */
export function parseFault(xml: string): string | null {
  const f = xmlTag(xml, "faultstring");
  return f ? xmlUnescape(f).slice(0, 300) : null;
}

/** "0001-00000023" */
export function formatVoucherNumber(ptoVta: number, number: number): string {
  return `${String(ptoVta).padStart(4, "0")}-${String(number).padStart(8, "0")}`;
}

/** URL del código QR de la factura (RG 4892): datos del comprobante en JSON base64. */
export function buildQrUrl(i: {
  date: string;
  cuit: string;
  ptoVta: number;
  number: number;
  totalCents: number;
  docTipo: number;
  docNro: string;
  cae: string;
}): string {
  const payload = {
    ver: 1,
    fecha: i.date,
    cuit: Number(i.cuit),
    ptoVta: i.ptoVta,
    tipoCmp: CBTE_TIPO_FACTURA_C,
    nroCmp: i.number,
    importe: Number((i.totalCents / 100).toFixed(2)),
    moneda: "PES",
    ctz: 1,
    tipoDocRec: i.docTipo,
    nroDocRec: Number(i.docNro),
    tipoCodAut: "E",
    codAut: Number(i.cae),
  };
  return `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
}

// ─── Red ────────────────────────────────────────────────────────────────────

async function soap(url: string, action: string | null, body: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", ...(action && { SOAPAction: action }) },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ArcaError("No se pudo conectar con ARCA");
  }
  const text = await res.text();
  if (!res.ok) throw new ArcaError(parseFault(text) ?? `ARCA respondió ${res.status}`, res.status >= 500);
  return text;
}

export interface AccessTicket {
  token: string;
  sign: string;
  expiresAt: Date;
}

/** Pide un ticket de acceso nuevo a WSAA (válido ~12 h). Quien llama debe cachearlo: WSAA rechaza pedir otro mientras haya uno vigente. */
export async function loginWsaa(config: ArcaConfig): Promise<AccessTicket> {
  const cms = signLoginTicket(buildLoginTicketRequest(), config.certPem, config.keyPem);
  const xml = await soap(
    ENDPOINTS[config.env].wsaa,
    "",
    `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`,
  );
  const ticketXml = xmlUnescape(xmlTag(xml, "loginCmsReturn") ?? "");
  const token = xmlTag(ticketXml, "token");
  const sign = xmlTag(ticketXml, "sign");
  const exp = xmlTag(ticketXml, "expirationTime");
  if (!token || !sign || !exp) throw new ArcaError(parseFault(xml) ?? "WSAA no devolvió un ticket válido");
  return { token, sign, expiresAt: new Date(exp) };
}

export async function fetchLastAuthorized(config: ArcaConfig, t: AccessTicket): Promise<number> {
  const xml = await soap(
    ENDPOINTS[config.env].wsfe,
    "http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado",
    buildLastAuthorizedRequest(config.cuit, config.ptoVta, t.token, t.sign),
  );
  return parseLastAuthorized(xml);
}

export async function fetchVoucher(config: ArcaConfig, t: AccessTicket, number: number) {
  try {
    const xml = await soap(
      ENDPOINTS[config.env].wsfe,
      "http://ar.gov.afip.dif.FEV1/FECompConsultar",
      buildConsultRequest(config.cuit, config.ptoVta, number, t.token, t.sign),
    );
    return parseConsult(xml);
  } catch (e) {
    // Un comprobante inexistente puede venir como fallo SOAP: se interpreta como "no existe" salvo caída de red.
    if (e instanceof ArcaError && !e.retryable) return null;
    throw e;
  }
}

export async function requestCae(config: ArcaConfig, t: AccessTicket, r: InvoiceRequest): Promise<{ result: CaeResult; raw: string }> {
  const raw = await soap(ENDPOINTS[config.env].wsfe, "http://ar.gov.afip.dif.FEV1/FECAESolicitar", buildCaeRequest(r, t.token, t.sign));
  return { result: parseCaeResponse(raw), raw };
}
