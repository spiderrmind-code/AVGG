# Alertas

`ALERTS_ENABLED=false` mantiene las alertas desactivadas. `ALERT_WEBHOOK_URL` y `ALERT_EMAIL` son opcionales y nunca se imprimen. El helper sanitiza contexto y deduplica por código durante cinco minutos; no bloquea la request ni reintenta indefinidamente. Activar sólo después de validar un destino externo y revisar readiness 503, 5xx repetidos, webhook inválido, payment mismatch, stock failure, CJ unknown y tracking exception.
