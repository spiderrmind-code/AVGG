import assert from "node:assert/strict";
import test from "node:test";
import { formatARS } from "../lib/currency";

test("formats commercial prices as Argentine pesos", () => {
  const formatted = formatARS(49999);
  assert.match(formatted, /49[.\u00a0 ]?999/);
  assert.ok(formatted.includes("$"));
});
