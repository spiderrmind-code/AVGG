# Incidencia de stock posterior al pago

## Detección

Una orden con `status: stock_issue`, `stockIssue: true` o `stockIssueReason` requiere revisión. El panel Operaciones muestra el motivo y la fecha; los eventos `order.stock_retry` conservan actor enmascarado, resultado y correlación.

## Diagnóstico y reintento

1. Confirmar que `paymentStatus` sea `approved` y que el pago no haya sido revertido.
2. Revisar el stock real de cada producto y cualquier reserva o ajuste manual pendiente.
3. Reintentar sólo si todos los items vuelven a tener disponibilidad confirmada.
4. Usar **Reintentar aplicación de stock** una sola vez y esperar su resultado. La operación usa el lock `stockProcessing` y `stockApplied`; no repetirla mientras esté procesando.

## Falta permanente

No reintentar si el proveedor no puede reponer. Registrar la decisión en la orden, contactar al comprador y acordar sustitución o cancelación. Los reembolsos son manuales: deben realizarse desde Mercado Pago por una persona autorizada y documentarse en el incidente.

## Verificación y rollback

Tras un resultado exitoso, confirmar `stockApplied: true`, `stockIssue: false` y que las cantidades de producto disminuyeron una sola vez. Si el resultado es `already_applied`, no realizar cambios adicionales. No hay rollback automático del pago ni del stock: escalar a Operaciones/Finanzas antes de modificar inventario manualmente.

## Escalamiento

Escalar si hay `database_error`, conflicto persistente, cantidades inconsistentes o un pago aprobado sin resolución dentro del SLA operativo. Adjuntar order ID, motivo, hora y request ID; nunca adjuntar tokens, dirección, teléfono ni datos completos de pago.
