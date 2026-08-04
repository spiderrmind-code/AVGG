# CJ fulfillment seguro

El fulfillment automático permanece desactivado. La creación real requiere aprobación manual, dirección con país ISO, variante y SKU CJ, y revalidación inmediata de stock, cotización y margen. Los timeouts posteriores al envío se mantienen en `unknown`; no se reintentan sin reconciliación.

Contrato revisado: `shopping/order/createOrderV3`, `shopping/order/list`, `shopping/order/getOrderDetail` y `logistic/trackInfo`. No se implementa cancelación hasta confirmar un endpoint contractual aplicable.
