# Runbook de órdenes

Antes de cambiar una orden, confirmar su estado actual y pago. No aprobar pagos manualmente ni editar paymentId, total, ítems, stockApplied o identificadores históricos de proveedores. El endpoint aplica filtro atómico, segunda lectura ante conflicto e idempotencia; la acción queda registrada en `operationalEvents` sin PII innecesaria.
