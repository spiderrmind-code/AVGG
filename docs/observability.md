# Observabilidad

Los eventos usan niveles `debug`, `info`, `warn` y `error`; en producción se emiten como JSON. El `requestId` acepta sólo caracteres seguros y se devuelve en `x-request-id`. Contexto permitido: ruta, método, estado, duración e identificadores parciales. Se excluyen tokens, URI Mongo, cookies, dirección, teléfono y email completo.

Health comprueba proceso; readiness comprueba configuración y MongoDB. Los contadores internos son sólo en memoria: en serverless se reinician y no sustituyen un exportador externo. Diagnóstico: correlacionar requestId, evento y estado HTTP sin copiar payloads.
