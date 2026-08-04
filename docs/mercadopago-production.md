# Mercado Pago en producción

## Flujo

1. `POST /api/orders` resuelve cada producto desde MongoDB, valida cantidad y stock, y calcula subtotal, envío, descuentos, total y moneda en el servidor.
2. La orden queda asociada a una clave de idempotencia por propietario. El índice único `orders_idempotency_owner_key_unique` impide duplicados por reintento o doble clic.
3. `POST /api/mercadopago` sólo acepta una orden accesible y pendiente. Genera una preferencia con items almacenados en la orden, `external_reference` igual al `orderId`, URLs absolutas y clave `X-Idempotency-Key`.
4. Las URLs de retorno sólo consultan la versión pública de la orden; nunca aprueban pagos ni alteran inventario.
5. El webhook exige `x-signature`, `x-request-id` y la firma HMAC-SHA256 documentada por Mercado Pago. El cuerpo aporta sólo el identificador: el pago se consulta de nuevo mediante la API oficial.
6. Se compara referencia externa, monto y moneda antes de persistir el estado. Al aprobarse, un bloqueo y una transacción MongoDB descuentan el stock una sola vez.

## Variables

- `MERCADOPAGO_MODE`: `sandbox` o `production` explícitamente.
- `MERCADOPAGO_ACCESS_TOKEN`: sólo servidor; nunca se expone al navegador.
- `MERCADOPAGO_WEBHOOK_SECRET`: secreto de la firma de notificaciones.
- `MERCADOPAGO_CURRENCY`: `ARS`.
- `NEXT_PUBLIC_SITE_URL`: URL HTTPS pública sin barra final.
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`: sólo si se habilita el SDK cliente; no participa en el checkout actual.

El webhook de producción es `https://DOMINIO/api/webhooks/mercadopago`. Las URLs de retorno son `/checkout/success`, `/checkout/pending` y `/checkout/failure` sobre el mismo dominio. Configurá la URL pública y el webhook HTTPS antes de cambiar `MERCADOPAGO_MODE` a producción.

## Estados y operaciones posteriores

`pending`, `in_process` y `authorized` permanecen pendientes. `approved` habilita el descuento de stock. `rejected` y `cancelled` no borran la orden. `partially_refunded`, `refunded` y `charged_back` se persisten como resultados posteriores; no reponen stock automáticamente ni activan fulfillment. Un contracargo prevalece y un reembolso no puede volver a aprobado por una notificación tardía.

Las notificaciones se procesan idempotentemente. Los errores de firma, referencia, monto, moneda o autorización no se reintentan de forma automática. Errores transitorios del proveedor se devuelven para que Mercado Pago reintente su notificación; no se generan preferencias ni descuentos de stock duplicados.

## Diagnóstico y rollback

Ejecutá `npm run verify:mercadopago` para revisar firma y normalización sin red ni credenciales. Ejecutá `npm run verify:production` para comprobar presencia de variables sin imprimir sus valores. Ante una incidencia, no modifiques la orden desde una URL de retorno: verificá el pago en Mercado Pago y el evento de webhook. Para deshabilitar cobros, retirà temporalmente el access token en la plataforma de despliegue y redeployá; no desactives la validación de firma.
