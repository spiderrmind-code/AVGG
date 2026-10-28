# Prueba aislada del sistema de turnos

No ejecutes estas pruebas con una URI de producción ni con datos personales reales.

## Preparación

1. Crea una base MongoDB desechable y un usuario con permisos limitados solo sobre esa base.
2. En un `.env.local` de prueba, configura `MONGODB_URI` para esa instancia y `MONGODB_DB=13_studio_appointments_staging`.
3. Configura `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `NEXTAUTH_URL=http://localhost:3000` y un `NEXTAUTH_SECRET` temporal. No copies credenciales de producción.
4. Inicia el sitio con `npm run dev` y crea/usa una cuenta administrativa solo para esta base.

## Flujo

1. Envía desde `/turnos` una solicitud con datos ficticios y confirma que la respuesta es exitosa solo después de guardarse un documento `requested` en `appointments`.
2. Repite la misma solicitud y confirma que devuelve `409` sin crear un segundo documento activo.
3. Desde `/admin/turnos`, confirma esa solicitud; verifica que cambie a `confirmed` y que exista su clave en `appointment_slot_locks`.
4. Crea otra solicitud y confirma el mismo día y horario; debe responder `409` y conservarse como no confirmada.
5. Reprograma el primer turno a otro horario; verifica que se libere la clave anterior y quede reservada la nueva.
6. Intenta actualizar un turno con una fecha imposible, un horario fuera de rango o sin sesión administrativa; deben responder `400` o `401/403` y no cambiar el documento.
7. Borra únicamente la base de staging al terminar, usando el panel/procedimiento del proveedor y verificando dos veces el nombre de la base.

Las pruebas unitarias `tests/appointments.test.ts` cubren validaciones puras. Esta prueba de integración requiere una base aislada y no forma parte de `npm test`.
