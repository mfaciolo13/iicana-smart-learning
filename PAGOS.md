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

## Aumentos trimestrales de cuotas

Pantalla: **Configuración → Aumentos de cuotas** (`/director/settings/fee-increases`). Solo el rol **Director** puede programar, modificar o cancelar aumentos; cada acción valida el rol en el servidor, no solo oculta el menú. El administrativo consulta los precios ya actualizados (*Pagos → Precios vigentes*) y el alumno ve sus cuotas con los precios nuevos.

### Qué se configura

Porcentaje (≥ 0, hasta 2 decimales), trimestre calendario (`2026-Q4`) y fecha de entrada en vigencia (dentro del trimestre y posterior a hoy). Se pide confirmación antes de programarlo y se muestra cuántas cuotas y planes alcanzaría. Estados: **programado** (editable y cancelable hasta su vigencia), **aplicado** (inmutable) y **cancelado**. Se registra quién lo configuró y quién lo modificó por última vez, y todo queda en la auditoría.

Un trimestre admite **un solo aumento vigente** (índice único): no se puede aplicar dos veces el mismo aumento al mismo período.

### Cómo se aplica

- Lo hace el cron diario `/api/cron/fee-increases` (04:00 UTC): no depende de que alguien abra la pantalla.
- Fórmula: `nuevo precio = precio anterior × (1 + porcentaje / 100)`, en centavos, redondeo mitad hacia arriba. Ej.: $ 70.000 con 15 % → $ 80.500.
- Se actualizan las cuotas **sin cobrar** (pendientes, vencidas, suspendidas) que vencen **desde la fecha de vigencia** y los **planes de precios por alumno**, así las cuotas nuevas nacen con el precio actualizado.
- Los precios de transferencia y efectivo se escalan con el mismo porcentaje, de modo que cada alumno conserva su propia relación entre lista y descuento (los precios individuales de la planilla no se pisan). Si una cuota no tenía precios propios, siguen derivándose del nuevo precio de lista con los descuentos generales.
- **No se tocan** los pagos confirmados, las cuotas anuladas ni las vencidas anteriores a la vigencia.
- Todo ocurre en una transacción con el aumento bloqueado: una segunda ejecución (cron repetido, dos instancias) encuentra el aumento ya aplicado y no hace nada.
- `fee_price_history` guarda el precio anterior, el nuevo, el porcentaje y la fecha de cada cuota o plan tocado (solo agregar). El detalle de una cuota muestra su historial de precios.
- Un aumento aplicado no puede cambiarse (trigger en la base): ninguna edición posterior altera cuotas o pagos históricos.

### Migración

`src/lib/drizzle/migrations/0022_aumentos_trimestrales.sql` (requiere la 0019): crea `fee_increases` y `fee_price_history` (RLS activado, sin policies) con sus índices únicos y triggers de inmutabilidad.

### Decisiones pendientes

- Política de actualización de los precios individuales de transferencia/efectivo (hoy: proporcional al mismo porcentaje). La planilla muestra casos en que el efectivo del 2.º semestre no es exactamente el 10 % de descuento sobre la nueva lista; si la academia prefiere fijarlos a mano, se editan por alumno en *Precios y recargos* después de aplicado el aumento.
