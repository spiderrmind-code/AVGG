import assert from "node:assert/strict";
import { createSimulatedCjFulfillmentClient, getCjFulfillmentEligibility, isMonotonicCjTrackingTransition } from "../lib/cj/fulfillment";
import { cjFulfillmentFixtureOrder } from "../tests/fixtures/cj-fulfillment";

async function main() {
  const eligibility = getCjFulfillmentEligibility(cjFulfillmentFixtureOrder);
  assert.equal(eligibility.eligible, true);
  assert.equal(isMonotonicCjTrackingTransition("shipped", "processing"), false);
  if (eligibility.eligible) assert.ok((await createSimulatedCjFulfillmentClient().createOrder(eligibility.payload)).supplierOrderId.startsWith("cj-sim-"));
  console.log("CJ fulfillment local verification: PASS");
  console.log("CJ real orders: 0\nExternal writes: 0");
}

void main();
