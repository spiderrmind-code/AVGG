import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createStudioD1Appointment, resolveStudioD1WorkerConfig } from "../lib/studio-d1-worker";

test("D1 worker config requires an HTTPS endpoint and an exclusive secret", () => {
  assert.equal(resolveStudioD1WorkerConfig({}), undefined);
  assert.throws(() => resolveStudioD1WorkerConfig({ STUDIO_D1_WORKER_URL: "http://example.test", STUDIO_D1_WORKER_SHARED_SECRET: "x".repeat(32) }));
  assert.throws(() => resolveStudioD1WorkerConfig({ STUDIO_D1_WORKER_URL: "https://example.test", STUDIO_D1_WORKER_SHARED_SECRET: "short" }));
  assert.deepEqual(resolveStudioD1WorkerConfig({ STUDIO_D1_WORKER_URL: "https://studio.example/", STUDIO_D1_WORKER_SHARED_SECRET: "x".repeat(32) }), { url: "https://studio.example", sharedSecret: "x".repeat(32) });
});

test("D1 adapter signs the exact timestamp and body without leaking its secret", async () => {
  const secret = "s".repeat(32);
  let request: Request | undefined;
  const response = await createStudioD1Appointment({ url: "https://studio.example", sharedSecret: secret }, {
    name: "Ada", email: "ada@example.test", phone: "+542212203747", style: "Fine line", idea: "Flor", preferredDate: "2026-12-01", preferredTime: "10:00", durationMinutes: 60, privacyNoticeVersion: "studio-booking-v1",
  }, async (input, init) => {
    request = new Request(input, init);
    return new Response(JSON.stringify({ id: "created" }), { status: 201 });
  });
  assert.equal(response.response.status, 201);
  assert.equal((response.result as { id: string }).id, "created");
  assert.ok(request);
  const body = await request.text();
  const timestamp = request.headers.get("x-studio-timestamp")!;
  assert.equal(request.headers.get("x-studio-signature"), createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"));
  assert.equal(body.includes(secret), false);
});
