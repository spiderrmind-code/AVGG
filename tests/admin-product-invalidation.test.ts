import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
test("admin product create, update and delete invoke both public invalidators", () => {
 const result = spawnSync(process.execPath,["--experimental-test-module-mocks","--import","tsx",path.join(process.cwd(),"tests","fixtures","admin-product-invalidation-harness.ts")],{cwd:process.cwd(),encoding:"utf8"});
 assert.equal(result.status,0,result.stderr||result.stdout);
});
