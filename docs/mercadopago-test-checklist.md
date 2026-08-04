# Checklist de prueba Mercado Pago sandbox

## Preparación

- [ ] Usar cuenta vendedora y compradora de prueba separadas; no usar credenciales productivas.
- [ ] Configurar `MERCADOPAGO_MODE=sandbox`, token sandbox y secreto de webhook en el entorno remoto.
- [ ] Publicar una URL HTTPS y registrar `https://DOMINIO/api/webhooks/mercadopago`.
- [ ] Configurar `NEXT_PUBLIC_SITE_URL` con ese dominio y moneda `ARS`.
- [ ] Ejecutar `npm run verify:mercadopago` y `npm run verify:production` sin revelar valores de variables.

## Flujo esperado

- [ ] Crear una orden con producto de prueba y monto conocido.
- [ ] Repetir el envío del checkout con la misma clave: debe reutilizar la orden.
- [ ] Abrir la preferencia sandbox y comprobar `external_reference`, moneda ARS, ítems, URLs de retorno y webhook.
- [ ] Completar una única compra sandbox con comprador de prueba.
- [ ] Confirmar que el webhook firmado consulta el pago oficial, guarda el identificador y deja la orden aprobada.
- [ ] Confirmar que el stock se descuenta una vez y que repetir la notificación no lo vuelve a descontar.
- [ ] Revisar que success, pending y failure sólo muestran el estado persistido y datos públicos enmascarados.

## Casos de estado

- [ ] Pendiente/en proceso/autorizado: sin descuento definitivo de stock.
- [ ] Rechazado o cancelado: orden preservada, sin descuento de stock.
- [ ] Reembolso parcial, total y contracargo: estado persistido sin reposición automática de stock ni fulfillment automático.

No se realizan reembolsos ni pagos reales desde esta guía. La cancelación de la prueba se hace desde el entorno sandbox de Mercado Pago; después comprobá que la orden conserva una traza coherente y que no expone email, dirección, teléfono, secretos ni payloads completos.
