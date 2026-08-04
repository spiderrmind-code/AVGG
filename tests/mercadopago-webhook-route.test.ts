import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

test("webhook trusts only a valid signature and verified payment status", () => {
  const result = spawnSync(process.execPath, ["--experimental-test-module-mocks", "--import", "tsx", path.join(process.cwd(), "tests", "fixtures", "mercadopago-webhook-route-harness.ts")], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
