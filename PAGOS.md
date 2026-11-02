# Módulo de Pagos

Cuotas con precio por medio de pago, cobro manual, caja de efectivo, comprobantes y auditoría.
Este documento resume cómo funciona, qué migraciones y variables de entorno necesita y cómo desplegarlo.

## Reglas de precios

Cada cuota tiene tres precios:

| Precio | Dónde se guarda | Si falta |
|---|---|---|
| Lista | `payments.amount` (mientras está impaga) | obligatorio |
| Transferencia | `payments.transfer_price` | lista − descuento general por transferencia (5 %) |
| Efectivo | `payments.cash_price` | lista − descuento general por efectivo (10 %) |

| Medio | Del día 1 al 10 (inclusive) | Desde el día 11 |
|---|---|---|
| Transferencia | precio de transferencia | lista |
| Efectivo | precio de efectivo | lista |
| Tarjeta de crédito | lista + 5 % | lista + 5 % |

- El recargo de tarjeta se calcula sobre el precio **de lista**, nunca sobre uno con descuento.
- La fecha es la local del instituto (`America/Argentina/Cordoba`, mismo huso que Buenos Aires), calculada en el servidor.
- Una cuota tiene además un tope propio (`discount_valid_until`, el día 10 de su mes): una cuota de marzo no recupera el descuento por pagarse el 5 de abril.
- Los porcentajes de descuento se **calculan** `(lista − final) / lista × 100`; nunca se tipean.
- Los importes se operan en centavos enteros (`src/lib/money.ts`) con redondeo mitad hacia arriba.
- Dirección edita los valores generales en **Configuración → Precios y recargos** y los precios acordados por alumno (planilla `cuotas`); el administrativo solo los consulta.
- Todo el cálculo vive en `src/modules/payments/lib/pricing.ts`. La interfaz solo muestra su resultado y el servidor **recalcula** al cobrar: si el importe que vio el operador ya no coincide (por ejemplo, venció el descuento mientras tenía la pantalla abierta), rechaza el cobro.

`payments.amount` es el precio de lista mientras la cuota está impaga y lo efectivamente cobrado una vez pagada, para que los reportes de recaudación existentes sigan sumando lo que entró. El desglose queda en `list_price_snapshot`, `discount_amount`, `discount_percentage`, `surcharge_amount` y `final_amount`.

## Caja de efectivo

- Libro de **sólo agregar** (`cash_movements`, con trigger que impide `UPDATE` y `DELETE`). El saldo es siempre la suma de sus movimientos; no existe un campo editable.
- Cada movimiento guarda saldo anterior, saldo posterior, motivo, responsable y fecha.
- Un cobro en **efectivo** ingresa a la caja en la misma transacción que marca la cuota como pagada, una sola vez (índice único por pago). Transferencias y tarjetas no tocan la caja.
- Retiros: importe > 0, motivo obligatorio, no pueden superar el saldo. Al guardarse se encola un correo "Notificación de retiro de caja" para Dirección; si el envío falla queda pendiente y se reintenta.
- Las correcciones se hacen con un movimiento compensatorio (Dirección, motivo obligatorio). Anular un pago cobrado en efectivo revierte su ingreso automáticamente.
- Roles: el administrativo registra ingresos, retiros y conciliaciones; Dirección consulta, carga el saldo inicial, revierte y ve el resumen financiero; el docente y el alumno no tienen acceso.

## Comprobantes y correos

- Todo pago confirmado genera un **comprobante interno** (`payment_documents`, tipo `receipt`, número `REC-00000001`), único por pago, y encola el correo al alumno con un enlace seguro (`/comprobante/<token>`).
- El comprobante dice expresamente que no reemplaza a la factura fiscal.
- `email_outbox` guarda cada correo con estado (`pending` / `sent` / `failed`), intentos y error. Se reintentan desde la caja ("Reintentar envío") y con el cron diario `/api/cron/outbox`.

## Auditoría

`audit_log` (sólo agregar) registra cobros, anulaciones, movimientos de caja y cambios de configuración económica, con valores anteriores y nuevos. Dirección la consulta en **Pagos → Auditoría**.

## Migración

`src/lib/drizzle/migrations/0019_pagos_precios_caja.sql` — aditiva (no borra ni reescribe datos; completa las columnas nuevas de las cuotas existentes). Las tablas nuevas tienen RLS activado y sin policies: sólo se acceden desde el servidor.

Aplicarla antes de desplegar el código (en Supabase → SQL editor, o con `psql $DATABASE_URL -f ...`). Crea: `app_settings`, `audit_log`, `student_fee_plans`, `cash_movements`, `cash_reconciliations`, `payment_documents`, `email_outbox`, la secuencia `payment_receipt_seq` y las columnas nuevas de `payments`.

## Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL`, `SUPABASE_*`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | sí | ya existentes |
| `NEXT_PUBLIC_SITE_URL` | sí | base de los enlaces de los correos (`/comprobante/...`) |
| `CRON_SECRET` | sí | autoriza `/api/cron/outbox` |
| `CASH_ALERT_EMAIL` | no | dirección institucional adicional para los avisos de retiro (además de los directores) |

## Decisiones pendientes de la dirección

1. Confirmar descuentos de 5 % (transferencia) y 10 % (efectivo), o mantener los precios individuales de la planilla cuando difieran (el sistema ya soporta ambos).
2. Confirmar el recargo de tarjeta de 5 % sobre la lista y su compatibilidad con las condiciones legales y comerciales.
3. Definir quién carga el saldo inicial de la caja y quién autoriza ingresos, retiros y reversiones.
4. Definir una dirección institucional para las alertas de retiros (`CASH_ALERT_EMAIL`).

## Facturación electrónica (Factura C con ARCA)

Código: `src/lib/arca.ts` (WSAA + WSFEv1) y `src/modules/payments/services/invoice.service.ts`. El comprobante interno **no** es una factura fiscal y así lo dice; la factura es un documento aparte (`payment_documents`, tipo `invoice_c`).

### Cuándo se factura

- Todo pago **electrónico** (transferencia o tarjeta) confirmado activa la emisión automáticamente.
- Los cobros en **efectivo** se facturan a pedido (botón *Emitir factura* en el detalle del pago) o automáticamente si Dirección lo activa en *Configuración → Precios y recargos → Facturación*. Esta política está pendiente de confirmar (ver «Decisiones»).
- Solo se factura un pago **confirmado**. La aprobación de Mercado Pago no equivale a una factura.

### Qué guarda

Tipo y número (`0003-00000024`), fecha de emisión, importe, **CAE y vencimiento**, estado (`pending` / `issued` / `failed`), datos del emisor y del receptor tal como se imprimieron, QR de verificación, observaciones/errores de ARCA y la relación con el pago y la cuota. La factura se imprime desde `/…/payments/<id>/invoice` o el enlace seguro `/comprobante/<token>`.

### Fallos e idempotencia

- Si ARCA falla, el pago ya está confirmado: la factura queda `failed` con el motivo y se puede **reintentar** (botón, o el cron diario hasta 5 intentos).
- Hay **una sola factura por pago** (índice único `(payment_id, document_type)`); una factura emitida se devuelve tal cual.
- El número de comprobante se **reserva en la fila antes de llamar a ARCA**. Si el proceso se corta después de que ARCA la autorizó, el reintento consulta ese número (`FECompConsultar`), reconoce el CAE y lo adopta en vez de emitir una segunda factura.
- Un lock transaccional serializa las emisiones para que dos facturas no pidan el mismo número.
- El ticket de acceso de WSAA (~12 h) se comparte entre instancias en `arca_access_tickets`.
- Para el receptor se informa el **DNI del alumno** y *Consumidor Final* como condición frente al IVA.

### Configuración

1. Dar de alta el certificado digital en ARCA (clave fiscal → *Administración de Certificados Digitales*), asociarlo al servicio **Facturación Electrónica (wsfe)** y habilitar un **punto de venta** de tipo «Factura Electrónica - Web Services».
2. Cargar las variables (el PEM admite `\n` escapados):

| Variable | Uso |
|---|---|
| `ARCA_ENV` | `homologacion` (por defecto) o `produccion` |
| `ARCA_CUIT` | CUIT del emisor (11 dígitos) |
| `ARCA_PTO_VTA` | punto de venta habilitado |
| `ARCA_CERT` | certificado X.509 en PEM |
| `ARCA_PRIVATE_KEY` | clave privada en PEM |
| `ARCA_RAZON_SOCIAL`, `ARCA_DOMICILIO`, `ARCA_INICIO_ACTIVIDADES`, `ARCA_INGRESOS_BRUTOS`, `ARCA_CONDICION_IVA` | datos del emisor que se imprimen en la factura |

3. **Probar primero en homologación** con el certificado de pruebas (las facturas salen marcadas «de PRUEBA»). Recién después pasar a `produccion` con el certificado productivo. Sin estas variables no se emiten facturas y el sistema lo informa en pantalla.

> El cliente de ARCA está implementado según la especificación de WSAA/WSFEv1 y cubierto con pruebas de armado y lectura de mensajes, pero **no pudo probarse contra los servidores de ARCA** sin un certificado propio de la academia. La primera emisión en homologación es parte de la puesta en marcha.

### Migración

`src/lib/drizzle/migrations/0021_facturacion_arca.sql` (requiere la 0019): crea `arca_access_tickets` (RLS activado, sin policies) y la política `payments.invoicing`.

### Decisiones pendientes de la dirección (facturación)

- Datos fiscales de la academia y alta del punto de venta en ARCA.
- Si el efectivo se factura automáticamente o a pedido.
- Concepto y período que debe llevar la factura de cada cuota (hoy: servicios, mes de la cuota).
