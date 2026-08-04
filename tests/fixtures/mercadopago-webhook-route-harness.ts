import assert from "node:assert/strict";
import { mock } from "node:test";

let paymentLookups = 0;
let stockApplications = 0;
let verifiedStatus = "approved";

async function main() {
await mock.module("next/server", { namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } } });
await mock.module("@/lib/mercadopago", {
  namedExports: {
    extractMercadoPagoPaymentId: (body: unknown) => typeof (body as { data?: { id?: unknown } })?.data?.id === "string" ? (body as { data: { id: string } }).data.id : null,
    getMercadoPagoPayment: async () => {
      paymentLookups += 1;
      return { id: "123", status: verifiedStatus, statusDetail: null, transactionAmount: 100, currencyId: "ARS", externalReference: "507f1f77bcf86cd799439011", preferenceId: null, dateApproved: null };
    },
    MercadoPagoProviderError: class MercadoPagoProviderError extends Error {},
  },
});
await mock.module("@/lib/mercadopago-orders", {
  namedExports: {
    processVerifiedMercadoPagoPayment: async () => ({ success: true as const, duplicate: false, orderId: "507f1f77bcf86cd799439011" }),
    applyPaidOrderStock: async () => {
      stockApplications += 1;
      return { success: true as const, outcome: "applied" as const, orderId: "507f1f77bcf86cd799439011" };
    },
  },
});
await mock.module("@/lib/mercadopago-webhook-signature", {
  namedExports: {
    verifyMercadoPagoWebhookSignature: ({ signature }: { signature: string | null }) => signature === "valid" ? { valid: true as const } : { valid: false as const, reason: "invalid_signature" as const },
    canAllowUnsignedMercadoPagoWebhook: () => false,
  },
});

const route = await import("../../app/api/webhooks/mercadopago/route");

async function post(signature: string | null, type = "payment") {
  return route.POST(new Request("https://store.example/api/webhooks/mercadopago", {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": signature ?? "", "x-request-id": "request" },
    body: JSON.stringify({ type, data: { id: "123" } }),
  }));
}

let response = await post("invalid");
assert.equal(response.status, 401);
assert.equal(paymentLookups, 0);

response = await post("valid");
assert.equal(response.status, 200);
assert.equal(stockApplications, 1);

verifiedStatus = "pending";
response = await post("valid");
assert.equal(response.status, 200);
assert.equal(stockApplications, 1);

response = await post("valid", "merchant_order");
assert.equal(response.status, 200);
assert.equal(paymentLookups, 2);

console.log("mercadopago webhook route mock coverage passed");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
