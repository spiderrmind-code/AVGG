# Checklist de producción

- [ ] Variables de `.env.example` configuradas en Vercel sin valores de ejemplo.
- [ ] `NEXT_PUBLIC_SITE_URL` y `NEXTAUTH_URL` usan el dominio HTTPS definitivo.
- [ ] Dominio principal configurado en Vercel.
- [ ] DNS confirmado y certificado SSL emitido.
- [ ] Callback Google: `https://DOMINIO/api/auth/callback/google` registrado.
- [ ] Webhook Mercado Pago: `https://DOMINIO/api/webhooks/mercadopago` registrado.
- [ ] MongoDB Atlas permite conexiones desde Vercel.
- [ ] `/api/health` responde 200.
- [ ] `/api/readiness` responde 200.
- [ ] Compra sandbox y webhook validados con HTTPS público.
- [ ] Primer pedido CJ controlado validado antes de automatizar fulfillment.
- [ ] Plan de rollback y acceso a logs de Vercel confirmados.
