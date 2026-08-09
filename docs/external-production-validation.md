# Validación externa de producción

## Objetivo

Completar las comprobaciones que no pueden ejecutarse localmente sin credenciales o servicios externos. Nunca pegar secretos en tickets, logs ni commits.

## MongoDB Atlas

Prerrequisitos: clúster activo y usuario de aplicación con permisos mínimos sobre `MONGODB_DB`.

Variables: `MONGODB_URI`, `MONGODB_DB`.

1. En Network Access agregá únicamente la IP o integración de Vercel requerida.
2. Confirmá DNS SRV y TLS desde el entorno destino.
3. Ejecutá `npm run verify:database` desde el entorno autorizado.

Resultado esperado: conexión, índices y transacciones verificados sin mostrar URI. Errores frecuentes: allowlist, DNS corporativo, firewall o permisos insuficientes. Reversión: retirar la regla de red o la variable del entorno afectado.

## Google OAuth

Prerrequisitos: cliente OAuth de producción y dominio definitivo.

Variables: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Registrá exactamente `${NEXTAUTH_URL}/api/auth/callback/google`, verificá dominios autorizados y probá login/redirect seguro. Resultado esperado: sesión creada y usuario persistido. Reversión: deshabilitar el proveedor en Google Cloud o retirar las variables; el login por credenciales continúa. No es validable localmente sin cliente real.

## Mercado Pago sandbox y webhook HTTPS

Prerrequisitos: URL pública HTTPS y credenciales sandbox.

Variables: `MERCADOPAGO_MODE`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_CURRENCY`, `NEXT_PUBLIC_SITE_URL`.

Configurá `https://<dominio>/api/webhooks/mercadopago`, y verificá returns `/checkout/success`, `/checkout/failure` y `/checkout/pending`. Ejecutá una compra sandbox con comprador de prueba y confirmá firma, consulta oficial, referencia, ARS e idempotencia. Resultado esperado: una sola aplicación de stock. Reversión: deshabilitar la notificación o cambiar a sandbox; no automatizar reembolsos. No se valida localmente sin evento real HTTPS.

## Vercel, Redis REST y variables

Prerrequisitos: proyecto Vercel, dominio y backend Redis REST opcional.

Variables: todas las anteriores más `RATE_LIMIT_REDIS_URL`, `RATE_LIMIT_REDIS_TOKEN`, `NODE_ENV`.

Configurá variables sólo en servidor, asignadas a Production/Preview según corresponda. Para Redis, la URL debe ser HTTPS y el token sólo de servidor. Sin ambas variables la aplicación usa fallback local, adecuado para desarrollo pero no para limitación global serverless. Verificá build, health/readiness y que ningún valor aparezca en logs. Reversión: redeploy de la versión previa o retirar las variables Redis para volver al fallback local.

## Smoke test, postdeploy y rollback

Después del deploy: abrir home, categoría, producto, búsqueda, carrito, checkout sin pago, login, `/api/health`, `/api/readiness`, sitemap y robots. Confirmar que admin requiere sesión y que webhook responde sólo a firma válida.

Resultado esperado: HTTP correctos, catálogo público actualizado tras una mutación admin y sin PII ni secretos. Errores frecuentes: variables ausentes, DNS aún propagando, Atlas no allowlisted o callback OAuth diferente. Para rollback: promover el deployment previo en Vercel, verificar variables, invalidar caché pública mediante una mutación administrativa controlada y documentar el incidente. El pago real, OAuth real y conectividad Atlas siguen siendo validaciones externas.
