import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

test("CJ fulfillment service validates, reserves, creates, syncs, and reconciles with isolated mocks", () => {
  const result = spawnSync(process.execPath, ["--experimental-test-module-mocks", "--import", "tsx", path.join(process.cwd(), "tests", "fixtures", "cj-fulfillment-service-harness.ts")], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
