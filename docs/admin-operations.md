# Operación administrativa

El detalle de una orden se consulta por `GET /api/admin/orders/[id]` sólo con sesión admin. Expone datos operativos necesarios y excluye tokens y payloads crudos de proveedores/pagos. Las transiciones válidas son `pending → processing → shipped → delivered` y `pending → cancelled` según la política del pago.

Cada transición individual registra `operationalEvents` con tipo, timestamp de servidor, resumen sanitizado y actor derivado de la sesión (email enmascarado). Los campos de pago, total, ítems, stock aplicado e IDs CJ no son editables desde el panel.

Stock se consulta en `/admin/stock` mediante `GET /api/admin/stock`, con `page` y `limit` (máximo 100), categoría, proveedor, activo, búsqueda y estado. Los estados son `available`, `low_stock` (1–3), `out_of_stock`, `unknown` y `stale` cuando el snapshot tiene más de 7 días.
