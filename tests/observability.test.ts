import assert from "node:assert/strict";
import test from "node:test";
import { notifyOperationalAlert } from "../lib/alerts";
import { sanitizeLogContext } from "../lib/logger";
import { incrementMetric, metricsSnapshot } from "../lib/metrics";
import { requestIdFrom } from "../lib/request-id";

test("observability helpers sanitize context, constrain request IDs, and remain local", () => {
  const sanitized = sanitizeLogContext({ token: "secret", authorization: "Bearer secret", mongo_uri: "mongodb://secret", email: "person@example.test", phone: "123", address: "street", event: "safe" });
  assert.deepEqual(sanitized, { email: "p***@example.test", event: "safe" });
  assert.equal(requestIdFrom(new Request("http://localhost", { headers: { "x-request-id": "safe-id_01" } })), "safe-id_01");
  assert.notEqual(requestIdFrom(new Request("http://localhost", { headers: { "x-request-id": "!invalid" } })), "!invalid");
  incrementMetric("requests_total"); assert.equal(metricsSnapshot().requests_total, 1);
  const previous = process.env.ALERTS_ENABLED; process.env.ALERTS_ENABLED = "false"; assert.equal(notifyOperationalAlert("test", { email: "person@example.test" }), false); process.env.ALERTS_ENABLED = previous;
});
