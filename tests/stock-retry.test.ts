import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");

test("stock retry stays behind the existing idempotent stock application lock", () => {
  const service = read("lib/mercadopago-orders.ts");
  const route = read("app/api/admin/orders/[id]/stock/retry/route.ts");
  assert.ok(service.includes('stockApplied: { $ne: true }'));
  assert.ok(service.includes('stockProcessing: { $ne: true }'));
  assert.ok(route.includes("applyPaidOrderStock(id)"));
  assert.ok(route.includes("INVALID_ORDER_ID"));
  assert.ok(route.includes("UNAUTHENTICATED"));
  assert.ok(route.includes("UNAUTHORIZED"));
  assert.ok(route.includes('"operationalEvents.key": { $ne: eventKey }'));
});

test("operations exposes a guarded retry control only for stock incidents", () => {
  const page = read("app/admin/operations/page.tsx");
  assert.ok(page.includes("order.stockIssue ?"));
  assert.ok(page.includes("Reintentar aplicación de stock"));
  assert.ok(page.includes("window.confirm"));
  assert.ok(page.includes("retryingId !== null"));
  assert.ok(page.includes("stockIssue: false"));
});
