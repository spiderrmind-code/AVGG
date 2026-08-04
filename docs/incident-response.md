# Respuesta a incidentes

Para MongoDB caído/readiness 503, 5xx repetidos, deploy o dominio caído, secreto comprometido, stock incorrecto, CJ unknown o tracking detenido: detectar por readiness/logs, estimar impacto, detener acciones riesgosas, revisar requestId/eventos y estado externo, aplicar rollback o rotación si corresponde, escalar al responsable y cerrar con causa, impacto y verificación. No copiar PII ni payloads externos al ticket.
