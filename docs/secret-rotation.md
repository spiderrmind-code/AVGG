# Rotación de secretos

Rotar `NEXTAUTH_SECRET`, secreto Google, password MongoDB, token y webhook secret de Mercado Pago, `CJ_API_KEY`, webhook de alertas y token Sentry (si se usa) desde sus proveedores. Actualizar variables remotas, desplegar, validar login/readiness/integraciones, conservar rollback temporal y revocar el secreto anterior. Nunca guardar valores en el repositorio.
