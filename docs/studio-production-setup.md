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
| `STUDIO_GOOGLE_CLIENT_ID` / `STUDIO_GOOGLE_CLIENT_SECRET` | OAuth exclusivo de Studio; crear en un proyecto Google Cloud independiente y configurar solo en Preview mientras se valida. |
| `STUDIO_PRIVACY_APPROVED` / `NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED` | Ambos deben ser `true` para habilitar cualquier recopilación. Mantenerlos en `false` hasta completar y publicar la revisión legal y de conservación; no sustituyen esa aprobación. |
| `STUDIO_RETENTION_POLICY_APPROVED` / `NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED` | Ambos deben ser `true` para habilitar recopilación. Solo activarlos después de definir y aprobar en `/admin/disponibilidad` los criterios de conservación para las tres categorías; por ahora, `false`. |
| `STUDIO_DATA_COLLECTION_ENABLED` | Debe permanecer `false` hasta aprobar identidad legal formal, política de privacidad y plazos de conservación. |
| `NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED` | Control de interfaz; mantener `false` junto al flag servidor hasta que las verificaciones legales estén aprobadas. |
| `STUDIO_APPOINTMENT_REQUESTS_ENABLED` / `NEXT_PUBLIC_STUDIO_APPOINTMENT_REQUESTS_ENABLED` | Activan la recepción de turnos por separado. Ambos permanecen en `false` hasta aprobar también la agenda y estar preparado para recibir solicitudes; cuentas pueden habilitarse sin abrir este canal. |
| `NEXTAUTH_URL` | URL HTTPS del deployment Studio. |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS pública de Studio para metadata y validación de origen. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de contacto público, solo dígitos: `542212203747`. |

## Disponibilidad

La agenda no presupone días, horarios, duración ni reglas de cancelación. Empieza cerrada hasta que el administrador de Studio guarde la configuración en `/admin/disponibilidad`. Ahí se pueden definir días de atención, una pausa por día, duración en múltiplos de 15 minutos, fechas bloqueadas, preaviso de cancelación y retención por categoría. La configuración se guarda en `studio_settings` de la base exclusiva de Studio.

Los plazos de solicitudes sin confirmar, turnos cancelados y turnos completados empiezan vacíos y no se presume ninguno. Un campo vacío no programa borrado TTL; solo se configura después de aprobar el criterio. Al guardar la política, se actualizan vencimientos de registros Studio existentes que llevan la versión de aviso de privacidad de Studio; si un vencimiento ya pasó, MongoDB puede borrar el registro de la base primaria. La anonimización y eliminación de cuentas se gestionan por separado. Los backups no se consideran eliminados cuando vence un documento de la base primaria.

## Pruebas locales de Studio

Ejecuta `npm run test:e2e:studio` para levantar el build de Studio con la recepción de datos cerrada y correr solo los E2E de Studio. `npm run test:e2e` conserva la suite general, incluidas las pruebas de ecommerce de AVG; no la ejecutes contra el build Studio porque sus rutas comerciales deben responder 404.

La página pública ofrece únicamente horarios configurados que admiten un turno completo y no se superponen con turnos confirmados. La API vuelve a validar la disponibilidad antes de guardar una solicitud y la administración la valida nuevamente al confirmar; los bloqueos Mongo por intervalos de 15 minutos protegen confirmaciones concurrentes. La solicitud sigue siendo una solicitud: solo el administrador la confirma.

No habilites solicitudes reales hasta que la base exclusiva conecte, la privacidad esté aprobada y el estudio configure su agenda real.

`STUDIO_ADMIN_PASSWORD` solo se necesita al crear una cuenta inicial mediante el script existente. Ejecutarlo únicamente contra una base Studio/staging confirmada. No dejar la contraseña en variables de runtime después de crear la cuenta. Nunca ejecutar seeds ni scripts de AVG para preparar Studio.

La app requiere que los dos flags de despliegue sean verdaderos y coincidan. Si solo uno está activo o son inconsistentes, se mantienen cerradas las rutas comerciales y se bloquea el acceso administrativo. No hay fallback a la base o al secreto de AVG.
El registro de clientes, las actualizaciones de perfil y Google OAuth requieren los seis flags de privacidad, retención y recopilación aprobados. Las solicitudes de turno requieren además ambos flags `STUDIO_APPOINTMENT_REQUESTS_ENABLED`; así se pueden habilitar cuentas sin abrir la recepción de turnos. Mantén los seis flags de aprobación/recopilación y los dos de turnos en `false` hasta completar las decisiones legales y operativas; no habilites datos reales mientras falte una aprobación.

## Google OAuth exclusivo

Crear el cliente web en un proyecto Google Cloud separado para 13 Studio; no reutilizar el proyecto `avgconnects-503806` ni sus credenciales. Configurar como URI de redirección autorizada la URL de Preview exacta más `/api/auth/callback/google`; la URL cambia si se usa una Preview distinta. Configurar los dominios y el consentimiento requeridos por Google y guardar las credenciales como `STUDIO_GOOGLE_CLIENT_ID` y `STUDIO_GOOGLE_CLIENT_SECRET` solo en Vercel Preview. No habilitar el proveedor ni los flags de recopilación antes de aprobar la identidad legal y la política de privacidad.

## MongoDB Atlas Free para staging

1. En Atlas existe un proyecto llamado `13-Studio` con un cluster Free llamado `13-Studio`. La consola mostraba un dataset de ejemplo cargado. No se confirmó que ese dataset sea propiedad de Studio ni que el cluster esté vacío; no consultes ni modifiques sus colecciones.
2. En **Database Access**, crea un usuario de base de datos exclusivo para Studio. Asígnale únicamente el rol integrado `readWrite` sobre `13_studio_appointments_staging`; no uses roles de administración ni acceso a todas las bases. Guarda la credencial en un gestor seguro y no la agregues al repositorio.
3. En **Network Access**, permite solo una dirección o rango de salida fijo y autorizado. No uses `0.0.0.0/0`. Para pruebas desde una computadora, permite su IP pública actual y quítala al terminar.
4. En **Clusters > Connect > Drivers**, copia la cadena de conexión del cluster de Studio y configúrala directamente como `STUDIO_MONGODB_URI` en Vercel Preview. Configura `STUDIO_MONGODB_DB=13_studio_appointments_staging` por separado. La aplicación selecciona esa base con la segunda variable.
5. Antes de probar reservas desde Vercel, confirma que la salida de red del deployment tenga una IP/rango fijo que pueda autorizarse en Atlas. Vercel no publica un rango fijo de egress por defecto. Static IPs está disponible en Pro/Enterprise a USD 100/mes por proyecto más transferencia regional; afecta todos los entornos del proyecto. Secure Compute ofrece red dedicada y conectividad privada, requiere Enterprise y precio acordado. Ninguna opción se habilita sin aprobación del costo y alcance; no abras el acceso a todas las IP.

### Alternativas gratuitas verificadas (sin contratar ni cambiar la red)

- **Vercel Hobby/egress predeterminado:** no ofrece una IP de salida fija/publicada; fijar región de Functions tampoco la vuelve estable. La allowlist actual de Atlas no habilita Preview.
- **Render Free (solo evaluación de staging):** Render publica rangos de salida por región, pero son compartidos por todos sus servicios de esa región. Su instancia Free duerme tras 15 minutos sin tráfico, tarda alrededor de un minuto en reactivarse y el proveedor indica que no debe usarse para producción. Puede servir para una prueba temporal si se limita Atlas a los rangos regionales exactos, se usa un usuario de base con `readWrite` únicamente sobre la base de Studio y se mantienen credenciales fuertes/TLS. No es una salida exclusiva por servicio ni una solución sostenible para el lanzamiento; no se desplegó ni se cambió la allowlist.
- **Free tiers, créditos promocionales y trials de otros clouds:** no se consideran solución permanente de costo cero. Los créditos expiran y algunos servicios de red/IP pueden facturarse después; no se activó ninguno.
- **Atlas private endpoint/VPC peering:** no disponible para el cluster Free/M0 actual; requiere cluster dedicado y servicios de red pagos.
- **Resultado:** no se encontró una ruta simultáneamente gratuita, permanente, de egress exclusivo y adecuada para producción que conecte Vercel Preview con Atlas Free. No autorizar la IP del equipo para Vercel, no confiar en rangos compartidos como solución de producción y no usar `0.0.0.0/0`. Mantener reservas y registro cerrados. Una prueba local desde un equipo cuya IP `/32` ya está permitida es independiente de Vercel y no habilita el servicio público.

Referencias oficiales: [Vercel Static IPs](https://vercel.com/docs/networking/static-ips), [Vercel fixed IP guidance](https://vercel.com/kb/guide/can-i-get-a-fixed-ip-address), [Render Free instances](https://render.com/docs/free), [Render outbound IP ranges](https://render.com/docs/outbound-ip-addresses), [Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/), [Atlas VPC peering](https://www.mongodb.com/docs/atlas/security-vpc-peering/) y [Atlas private endpoints](https://www.mongodb.com/docs/atlas/security-private-endpoint/).

La conexión, creación de colecciones, índices implícitos `_id` y persistencia real deben verificarse solo después de confirmar el proyecto, cluster, base y usuario de Studio. No ejecutes el alta administrativa ni envíes solicitudes hasta entonces.

### Estado observado de Atlas (solo lectura)

- El proyecto Atlas `13-Studio` y el cluster `13-Studio` (Free) existen; Atlas reportó que se cargó un dataset de ejemplo.
- La consola mostraba un usuario de base de datos con rol `atlasAdmin` en `admin` y recursos `All Resources`. No debe usarse desde la aplicación Studio.
- Network Access muestra dos entradas activas `/32` y ninguna entrada universal; no se modificaron. Estas direcciones no autorizan egress de Vercel.
- La sección Backup mostró la página de información de backups, no una política o estado de backups confirmado.
- No se creó usuario, no se cambió la lista IP y no se probó conexión. El usuario visible existente tiene permisos administrativos amplios y no debe usarse. El usuario limitado a `readWrite` sobre `13_studio_appointments_staging`, el estado del cluster y los backups deben verificarse antes de conectar Preview.

## Privacidad y conservación

13 Studio Tattoo es el nombre comercial. No se presume que sea una persona jurídica ni se asigna una identidad legal al responsable: su identidad y domicilio deben confirmarse y publicarse antes de habilitar datos reales. El servidor y los formularios requieren que los dos flags de recopilación, los dos de aprobación de privacidad y los dos de aprobación de retención sean `true`; si falta cualquiera, permanecen cerrados.

- Solicitudes no confirmadas: el plazo está pendiente de definición y aprobación. Se configura en `/admin/disponibilidad`; sin un plazo guardado no se agrega `expiresAt`.
- Turnos cancelados: el plazo está pendiente de definición y aprobación. No se presume un plazo ni se programa expiración mientras el campo siga vacío.
- Turnos completados: el plazo está pendiente de definición y aprobación. No reciben expiración automática mientras el campo siga vacío.
- Cuentas: se mantienen mientras estén activas. El endpoint de eliminación de cuenta elimina el perfil y anonimiza datos personales de turnos vinculados en la base operativa.
- Backups: proveedor, política de rotación, retención, restauración y borrado definitivo no están verificados. El TTL y la anonimización operan sobre la base primaria y no acreditan el borrado de copias.

Antes de habilitar datos reales, reemplaza esta declaración preliminar por la identidad y domicilio aprobados, confirma los criterios de retención (incluidos turnos completados y excepciones) y verifica el ciclo de backups. Luego guarda cada plazo acordado y aprueba explícitamente la política. No inventes esos datos ni los deduzcas de un comportamiento técnico de TTL.

### Estado observado de Google OAuth

El proyecto exclusivo `studio-13-tattoo-oauth-2026` existe, pero Google Auth Platform indica que aún no está configurado. No se ve un cliente OAuth ni un callback autorizado. Falta completar la identidad de marca y el correo público de soporte antes de crear/publicar la configuración; no se usaron credenciales de AVG Connects.

## Vinculación y preview

El checkout original de AVG está vinculado a `avgconnects-v74d`; no ejecutes comandos Vercel desde allí. Este worktree aislado de Studio se vinculó al proyecto independiente `13-studio-tattoo`. La configuración raíz `vercel.json` contiene cron jobs de ecommerce.

`vercel.studio.json` no configura crons, pero Vercel no lo selecciona automáticamente desde Git Integration. La CLI confirma que el proyecto vinculado es `13-studio-tattoo` con ID `prj_IijSg3jsr2HXfIgCn2csevb1pF3H`. La Preview se puede consultar de forma autenticada con `vercel curl`; no hace falta desactivar su protección SSO. Antes de desplegar:

1. Verificar en el dashboard que exista un proyecto Vercel independiente llamado `13-studio-tattoo`, con su propio Project ID, equipo, rama y variables. El hostname de una preview por sí solo no confirma esos ajustes.
2. No cambiar ni relinkear el proyecto AVG existente.
3. Para un deployment CLI, usar un checkout/carpeta aislados, vincular allí solo el Project ID previamente verificado y pasar explícitamente `--local-config vercel.studio.json`. Revisar el proyecto/destino que imprime la CLI antes de continuar.
4. No usar la integración Git si no se ha verificado cómo excluye la configuración raíz `vercel.json` y sus crons.
5. Hacer únicamente una preview después de completar las variables y probar aislamiento, readiness, autorización y reservas contra staging. No promover a producción hasta aprobar esa preview.

La Preview más reciente respondió `/api/health` con `service: 13-studio-tattoo`; `/api/readiness` sigue en `503` porque MongoDB no está conectado. La protección SSO permanece activa y no se ha probado escritura o lectura real de reservas.

## Verificaciones externas pendientes

- Confirmar el Project ID y la configuración del proyecto independiente desde el dashboard de Vercel.
- Crear/autorizar una base MongoDB desechable de Studio y completar el flujo de escritura/lectura con datos ficticios.
- Completar la identidad legal del responsable y el plazo de conservación antes de recopilar datos reales; el texto público de privacidad indica expresamente este pendiente.
- Configurar las variables de Studio en preview y producción sin copiar valores de AVG Connects.
