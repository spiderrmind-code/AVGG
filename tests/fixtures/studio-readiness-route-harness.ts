import assert from "node:assert/strict";
import { mock } from "node:test";

process.env.STUDIO_DEPLOYMENT = "true";
process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "true";

let studioConnections = 0;
let avgConnections = 0;
let studioFails = false;

async function main() {
  await mock.module("next/server", {
    namedExports: { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
  });
  await mock.module("@/lib/health", {
    namedExports: {
      checkReadiness: async (checkDatabase: () => Promise<void>) => {
        try {
          await checkDatabase();
          return { ready: true as const };
        } catch {
          return { ready: false as const };
        }
      },
    },
  });
  await mock.module("@/lib/logger", { namedExports: { logServerError: () => undefined } });
  await mock.module("@/lib/mongo", {
    namedExports: {
      getDb: async () => {
        avgConnections += 1;
        return { command: async () => undefined };
      },
    },
  });
  await mock.module("@/lib/studio-mongo", {
    namedExports: {
      getStudioDb: async () => {
        studioConnections += 1;
        return { command: async () => { if (studioFails) throw new Error("unavailable"); } };
      },
    },
  });
  await mock.module("@/lib/request-id", {
    namedExports: {
      requestIdFrom: () => "test-request",
      withRequestId: (response: Response) => response,
    },
  });

  const route = await import("../../app/api/readiness/route");
  const request = new Request("https://studio.example/api/readiness");

  let response = await route.GET(request);
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { service: string }).service, "13-studio-tattoo");
  assert.equal(studioConnections, 1);
  assert.equal(avgConnections, 0);

  process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "false";
  response = await route.GET(request);
  assert.equal(response.status, 503, "an inconsistent deployment must fail readiness closed");
  assert.equal(studioConnections, 1);
  assert.equal(avgConnections, 0);
  process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "true";

  studioFails = true;
  response = await route.GET(request);
  assert.equal(response.status, 503);
  assert.equal((await response.json() as { service: string }).service, "13-studio-tattoo");
  assert.equal(avgConnections, 0);

  process.env.STUDIO_DEPLOYMENT = "false";
  process.env.NEXT_PUBLIC_STUDIO_DEPLOYMENT = "false";
  response = await route.GET(request);
  assert.equal(response.status, 200);
  assert.equal((await response.json() as { service: string }).service, "avg-connects");
  assert.equal(avgConnections, 1);

  console.log("Studio readiness database isolation mock coverage passed");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
