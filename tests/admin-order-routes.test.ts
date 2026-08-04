import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

function runRouteHarness(route: "general" | "individual") {
  const result = spawnSync(process.execPath, ["--experimental-test-module-mocks", "--import", "tsx", path.join(process.cwd(), "tests", "fixtures", "admin-order-route-harness.ts"), route], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("PATCH /api/admin/orders is covered with isolated module mocks", () => {
  runRouteHarness("general");
});

test("PATCH /api/admin/orders/[id] is covered with isolated module mocks", () => {
  runRouteHarness("individual");
});
