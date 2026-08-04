import assert from "node:assert/strict";
import { sanitizeLogContext } from "../lib/logger";
import { requestIdFrom } from "../lib/request-id";
assert.equal("token" in sanitizeLogContext({ token: "secret", email: "person@example.test" }), false);
assert.match(String(sanitizeLogContext({ email: "person@example.test" }).email), /^p\*\*\*@/);
assert.notEqual(requestIdFrom(new Request("http://localhost")), "");
console.log("Observability verification: PASS");
