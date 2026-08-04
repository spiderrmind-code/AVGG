# Rollback de deployment

En Vercel, seleccionar y promover el deployment previo conocido. Confirmar variables, luego `/api/health`, `/api/readiness` y smoke test read-only. No ejecutar migraciones durante rollback sin plan de compatibilidad. Registrar deployment, hora, motivo, resultados y validar recuperación antes de cerrar.
