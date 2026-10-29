# Preparación de despliegue de 13 Studio Tattoo

## Variables del proyecto Studio

Configurar estas variables en un proyecto Vercel independiente y en el entorno local de Studio:

| Variable | Uso |
| --- | --- |
| `STUDIO_DEPLOYMENT` | Activación de servidor; debe ser `true`. |
| `NEXT_PUBLIC_STUDIO_DEPLOYMENT` | Aislamiento de rutas en el build; debe ser `true`. |
| `STUDIO_MONGODB_URI` | URI de MongoDB autorizada para Studio; nunca copiar la URI de AVG Connects. |
| `STUDIO_MONGODB_DB` | Base exclusiva de Studio; la aplicación rechaza `AVGCONNECTS`. |
| `STUDIO_NEXTAUTH_SECRET` | Secreto de firma exclusivo de sesiones Studio; no reutilizar los secretos de AVG Connects. |
| `STUDIO_ADMIN_EMAIL` | Email exacto permitido para administrar las reservas. |
| `NEXTAUTH_URL` | URL HTTPS del deployment Studio. |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS pública de Studio para metadata y validación de origen. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de contacto público, solo dígitos: `542212203747`. |

`STUDIO_ADMIN_PASSWORD` solo se necesita al crear una cuenta inicial mediante el script existente. Ejecutarlo únicamente contra una base Studio/staging confirmada. No dejar la contraseña en variables de runtime después de crear la cuenta. Nunca ejecutar seeds ni scripts de AVG para preparar Studio.

La app requiere que los dos flags de despliegue sean verdaderos y coincidan. Si solo uno está activo o son inconsistentes, se mantienen cerradas las rutas comerciales y se bloquea el acceso administrativo. No hay fallback a la base o al secreto de AVG.

## MongoDB Atlas Free para staging

1. En Atlas, crea un proyecto separado para Studio y provisiona un cluster M0 Free en una región adecuada. No uses el proyecto, cluster ni usuario de AVG Connects.
2. En **Database Access**, crea un usuario de base de datos exclusivo para Studio. Asígnale únicamente el rol integrado `readWrite` sobre `13_studio_appointments_staging`; no uses roles de administración ni acceso a todas las bases. Guarda la credencial en un gestor seguro y no la agregues al repositorio.
3. En **Network Access**, permite solo una dirección o rango de salida fijo y autorizado. No uses `0.0.0.0/0`. Para pruebas desde una computadora, permite su IP pública actual y quítala al terminar.
4. En **Clusters > Connect > Drivers**, copia la cadena de conexión del cluster de Studio y configúrala directamente como `STUDIO_MONGODB_URI` en Vercel Preview. Configura `STUDIO_MONGODB_DB=13_studio_appointments_staging` por separado. La aplicación selecciona esa base con la segunda variable.
5. Antes de probar reservas desde Vercel, confirma que la salida de red del deployment tenga una IP/rango fijo que pueda autorizarse en Atlas. Si el plan disponible no ofrece egress fijo sin costo, no abras el acceso a todas las IP: deja la persistencia remota bloqueada hasta disponer de una opción de red aprobada.

La conexión, creación de colecciones, índices implícitos `_id` y persistencia real deben verificarse solo después de confirmar el proyecto, cluster, base y usuario de Studio. No ejecutes el alta administrativa ni envíes solicitudes hasta entonces.

## Vinculación y preview

El checkout original de AVG está vinculado a `avgconnects-v74d`; no ejecutes comandos Vercel desde allí. Este worktree aislado de Studio se vinculó al proyecto independiente `13-studio-tattoo`. La configuración raíz `vercel.json` contiene cron jobs de ecommerce.

`vercel.studio.json` no configura crons, pero Vercel no lo selecciona automáticamente desde Git Integration. Antes de desplegar:

1. Verificar en el dashboard que exista un proyecto Vercel independiente llamado `13-studio-tattoo`, con su propio Project ID, equipo, rama y variables. El hostname de una preview por sí solo no confirma esos ajustes.
2. No cambiar ni relinkear el proyecto AVG existente.
3. Para un deployment CLI, usar un checkout/carpeta aislados, vincular allí solo el Project ID previamente verificado y pasar explícitamente `--local-config vercel.studio.json`. Revisar el proyecto/destino que imprime la CLI antes de continuar.
4. No usar la integración Git si no se ha verificado cómo excluye la configuración raíz `vercel.json` y sus crons.
5. Hacer únicamente una preview después de completar las variables y probar aislamiento, readiness, autorización y reservas contra staging. No promover a producción hasta aprobar esa preview.

La preview proporcionada durante la revisión no quedó validada como deployment de Studio: `/api/health` respondió `service: avg-connects` y `/api/readiness` respondió `503` con el mismo servicio. Aunque `/cart` respondió `404`, esa evidencia no confirma el Project ID, la base ni las variables que usa el deployment.

## Verificaciones externas pendientes

- Confirmar el Project ID y la configuración del proyecto independiente desde el dashboard de Vercel.
- Crear/autorizar una base MongoDB desechable de Studio y completar el flujo de escritura/lectura con datos ficticios.
- Completar la identidad legal del responsable y el plazo de conservación antes de recopilar datos reales; el texto público de privacidad indica expresamente este pendiente.
- Configurar las variables de Studio en preview y producción sin copiar valores de AVG Connects.
