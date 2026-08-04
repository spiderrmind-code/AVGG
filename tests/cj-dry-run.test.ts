import assert from "node:assert/strict";
import test from "node:test";
import { planCjDryRun, planCjFulfillmentDryRun } from "../lib/cj/dry-run";
import { cjDryRunExisting, cjDryRunFixtures } from "./fixtures/cj-dry-run";
import { cjFulfillmentFixtureOrder } from "./fixtures/cj-fulfillment";

test("plans CJ fixtures without external dependencies", () => {
  const { summary } = planCjDryRun(cjDryRunFixtures, cjDryRunExisting);
  assert.deepEqual(summary, { processed: 6, insert: 2, update: 1, skip: 0, duplicate: 1, error: 2 });
});

test("checks synthetic fulfillment eligibility without provider or database access", () => {
  assert.deepEqual(planCjFulfillmentDryRun([cjFulfillmentFixtureOrder, { paymentStatus: "pending" }]), { checked: 2, eligible: 1, rejected: 1 });
});
