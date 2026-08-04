# Despliegue de producción

## Vercel

- Framework preset: Next.js.
- Root directory: repositorio raíz.
- Install command: `npm install`.
- Build command: `npm run build`.
- Output: el predeterminado de Next.js; no se requiere `vercel.json`.
- Node.js: 22.x, según `package.json`.

Configurá las variables de `.env.example` en Vercel. Nunca copies `.env.local` ni secretos al repositorio.

## URL y dominio

Definí `NEXT_PUBLIC_SITE_URL` y `NEXTAUTH_URL` como `https://DOMINIO`, sin barra final. El callback de Google debe ser:

`https://DOMINIO/api/auth/callback/google`

Conectá el dominio principal en Vercel, configurá los DNS que Vercel indique y esperá la emisión automática de SSL. Podés agregar `www` y redirigirlo al dominio principal. No declares estas tareas completas hasta verificarlas desde Vercel/DNS.

## Servicios externos

- MongoDB Atlas: permitir la conectividad de Vercel y configurar `MONGODB_URI` y `MONGODB_DB`.
- Mercado Pago: registrar `https://DOMINIO/api/webhooks/mercadopago`; las URLs de éxito, fallo y pendiente se derivan de la URL pública.
- Google: registrar el callback anterior en Google Cloud.
- CJ: conservar `CJ_API_KEY` sólo en servidor. No habilita fulfillment automático.

## Verificación posterior al deploy

- `GET https://DOMINIO/api/health` debe responder 200.
- `GET https://DOMINIO/api/readiness` debe responder 200 cuando MongoDB esté disponible, o 503 sin revelar detalles.
- Ejecutar una compra sandbox y validar webhook HTTPS antes de aceptar pagos reales.

## Rollback y diagnóstico

Usá el redeploy de la última implementación saludable de Vercel. Ante un 503 de readiness, verificá conectividad Atlas y variables sin copiar secretos en logs. Ante OAuth o pagos fallidos, verificá callback/webhook y URL pública antes de modificar código.
