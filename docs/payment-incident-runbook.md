# Incidentes de pago

Ante webhook no recibido/duplicado, payment mismatch, pago aprobado sin actualización, stock no aplicado, reembolso o contracargo: revisar firma, requestId, referencia, monto, moneda y estado oficial. No aprobar manualmente una orden. El webhook idempotente es la fuente de actualización; escalar a Mercado Pago cuando la verificación oficial no resuelva el estado.
