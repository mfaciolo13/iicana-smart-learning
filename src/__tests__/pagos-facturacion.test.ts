import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import forge from "node-forge";
import {
  ArcaError,
  buildCaeRequest,
  buildLoginTicketRequest,
  buildQrUrl,
  formatVoucherNumber,
  getArcaConfig,
  parseCaeResponse,
  parseConsult,
  parseLastAuthorized,
  signLoginTicket,
  xmlTag,
} from "@/lib/arca";

function selfSigned() {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date(Date.now() - 3600_000);
  cert.validity.notAfter = new Date(Date.now() + 86_400_000);
  const attrs = [{ name: "commonName", value: "smart-learning-test" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return { certPem: forge.pki.certificateToPem(cert), keyPem: forge.pki.privateKeyToPem(keys.privateKey) };
}

describe("autenticación WSAA", () => {
  it("arma el TRA con ventana de 20 minutos y el servicio wsfe", () => {
    const tra = buildLoginTicketRequest(new Date("2026-11-05T15:00:00Z"));
    expect(tra).toContain("<service>wsfe</service>");
    expect(tra).toContain("<generationTime>2026-11-05T11:50:00-03:00</generationTime>");
    expect(tra).toContain("<expirationTime>2026-11-05T12:10:00-03:00</expirationTime>");
  });

  it("firma el TRA como CMS con el contenido incluido y se puede leer de vuelta", () => {
    const { certPem, keyPem } = selfSigned();
    const tra = buildLoginTicketRequest();
    const b64 = signLoginTicket(tra, certPem, keyPem);
    const der = forge.util.decode64(b64);
    const p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der)) as unknown as { certificates: unknown[]; rawCapture: { signature: unknown } };
    expect(p7.certificates).toHaveLength(1);
    expect(p7.rawCapture.signature).toBeTruthy();
    // El contenido viaja dentro del CMS (no desacoplado): WSAA lo exige así.
    expect(der).toContain("loginTicketRequest");
  });
});

describe("pedido de CAE de una Factura C", () => {
  const req = {
    cuit: "20123456786",
    ptoVta: 3,
    date: "2026-11-05",
    number: 24,
    totalCents: 7350000,
    docTipo: 96,
    docNro: "30111222",
    serviceFrom: "2026-11-01",
    serviceTo: "2026-11-30",
    dueDate: "2026-11-10",
  };

  it("usa el comprobante tipo 11, concepto servicios y sin discriminar IVA", () => {
    const xml = buildCaeRequest(req, "TOKEN", "SIGN");
    expect(xml).toContain("<ar:CbteTipo>11</ar:CbteTipo>");
    expect(xml).toContain("<ar:Concepto>2</ar:Concepto>");
    expect(xml).toContain("<ar:ImpTotal>73500.00</ar:ImpTotal>");
    expect(xml).toContain("<ar:ImpNeto>73500.00</ar:ImpNeto>");
    expect(xml).toContain("<ar:ImpIVA>0.00</ar:ImpIVA>");
    expect(xml).toContain("<ar:CbteDesde>24</ar:CbteDesde>");
    expect(xml).toContain("<ar:CbteFch>20261105</ar:CbteFch>");
    expect(xml).toContain("<ar:FchVtoPago>20261110</ar:FchVtoPago>");
    expect(xml).toContain("<ar:DocNro>30111222</ar:DocNro>");
    expect(xml).toContain("<ar:CondicionIVAReceptorId>5</ar:CondicionIVAReceptorId>");
    expect(xml).not.toContain("<ar:Iva>");
  });

  it("escapa el token y no deja caracteres que rompan el XML", () => {
    const xml = buildCaeRequest(req, "a<b>&", "s");
    expect(xml).toContain("a&lt;b&gt;&amp;");
  });
});

describe("respuestas de ARCA", () => {
  const approved = `<soap:Envelope><soap:Body><FECAESolicitarResponse><FECAESolicitarResult><FeDetResp><FECAEDetResponse>
    <CbteDesde>24</CbteDesde><Resultado>A</Resultado><CAE>74123456789012</CAE><CAEFchVto>20261115</CAEFchVto>
  </FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse></soap:Body></soap:Envelope>`;

  const rejected = `<FECAESolicitarResponse><FECAESolicitarResult><FeDetResp><FECAEDetResponse>
    <Resultado>R</Resultado><CAE></CAE>
    <Observaciones><Obs><Code>10016</Code><Msg>El numero de comprobante no es el proximo</Msg></Obs></Observaciones>
  </FECAEDetResponse></FeDetResp></FECAESolicitarResult></FECAESolicitarResponse>`;

  it("interpreta una factura aprobada", () => {
    const r = parseCaeResponse(approved);
    expect(r.approved).toBe(true);
    expect(r.cae).toBe("74123456789012");
    expect(r.caeExpiration).toBe("2026-11-15");
    expect(r.number).toBe(24);
  });

  it("interpreta un rechazo con su observación y no lo da por aprobado", () => {
    const r = parseCaeResponse(rejected);
    expect(r.approved).toBe(false);
    expect(r.cae).toBeNull();
    expect(r.observations[0]).toContain("10016");
  });

  it("no considera aprobada una respuesta 'A' sin CAE válido", () => {
    const r = parseCaeResponse(approved.replace("74123456789012", "123"));
    expect(r.approved).toBe(false);
  });

  it("lee el último comprobante autorizado y falla si ARCA informa errores", () => {
    expect(parseLastAuthorized("<FECompUltimoAutorizadoResult><PtoVta>3</PtoVta><CbteTipo>11</CbteTipo><CbteNro>23</CbteNro></FECompUltimoAutorizadoResult>")).toBe(23);
    expect(() => parseLastAuthorized("<Errors><Err><Code>600</Code><Msg>No autorizado</Msg></Err></Errors>")).toThrow(ArcaError);
  });

  it("reconoce un comprobante ya autorizado (reintento tras un corte)", () => {
    const found = parseConsult(
      "<ResultGet><DocNro>30111222</DocNro><ImpTotal>73500.00</ImpTotal><CodAutorizacion>74123456789012</CodAutorizacion><FchVto>20261115</FchVto></ResultGet>",
    );
    expect(found).toEqual({ cae: "74123456789012", caeExpiration: "2026-11-15", totalCents: 7350000, docNro: "30111222" });
    expect(parseConsult("<ResultGet></ResultGet>")).toBeNull();
  });

  it("extrae etiquetas ignorando prefijos de namespace", () => {
    expect(xmlTag("<ns2:Resultado>A</ns2:Resultado>", "Resultado")).toBe("A");
  });
});

describe("datos del comprobante", () => {
  it("numera con punto de venta de 4 dígitos y número de 8", () => {
    expect(formatVoucherNumber(3, 24)).toBe("0003-00000024");
  });

  it("arma la URL del QR con los datos de la factura", () => {
    const url = buildQrUrl({ date: "2026-11-05", cuit: "20123456786", ptoVta: 3, number: 24, totalCents: 7350000, docTipo: 96, docNro: "30111222", cae: "74123456789012" });
    expect(url.startsWith("https://www.afip.gob.ar/fe/qr/?p=")).toBe(true);
    const json = JSON.parse(Buffer.from(url.split("?p=")[1], "base64").toString("utf8"));
    expect(json).toMatchObject({ ver: 1, tipoCmp: 11, ptoVta: 3, nroCmp: 24, importe: 73500, moneda: "PES", tipoCodAut: "E", codAut: 74123456789012, cuit: 20123456786 });
  });
});

describe("configuración fiscal", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("sin datos completos la facturación queda deshabilitada", () => {
    delete process.env.ARCA_CUIT;
    expect(getArcaConfig()).toBeNull();
  });

  it("acepta el PEM con saltos de línea escapados y entorno de homologación por defecto", () => {
    process.env.ARCA_CUIT = "20-12345678-6";
    process.env.ARCA_PTO_VTA = "3";
    process.env.ARCA_CERT = "-----BEGIN CERTIFICATE-----\\nAAA\\n-----END CERTIFICATE-----";
    process.env.ARCA_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nBBB\\n-----END PRIVATE KEY-----";
    delete process.env.ARCA_ENV;
    const c = getArcaConfig();
    expect(c?.env).toBe("homologacion");
    expect(c?.cuit).toBe("20123456786");
    expect(c?.certPem).toContain("\nAAA\n");
  });
});

describe("idempotencia de la emisión (código)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("hay un solo documento por pago y tipo, y una factura emitida se devuelve sin volver a emitir", () => {
    const sql = read("src/lib/drizzle/migrations/0019_pagos_precios_caja.sql");
    expect(sql).toContain("payment_documents_payment_type_unique ON payment_documents (payment_id, document_type)");
    const src = read("src/modules/payments/services/invoice.service.ts");
    expect(src).toContain('if (doc.fiscalStatus === "issued") return');
    expect(src).toContain("fetchVoucher(config, ticket, number)");
  });

  it("solo se factura un pago confirmado", () => {
    const src = read("src/modules/payments/services/invoice.service.ts");
    expect(src).toContain('payment.status !== "paid"');
  });

  it("un fallo fiscal nunca deshace el cobro", () => {
    const src = read("src/modules/payments/services/collect.service.ts");
    expect(src).toMatch(/try \{[\s\S]*issueInvoice\(result\.payment\.id\)[\s\S]*\} catch/);
  });
});
