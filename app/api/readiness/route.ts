import { NextResponse } from "next/server";
import { checkReadiness } from "@/lib/health";
import { logServerError } from "@/lib/logger";
import { getDb } from "@/lib/mongo";
import { requestIdFrom, withRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  const result = await checkReadiness(async () => { await (await getDb()).command({ ping: 1 }); });
  if (!result.ready) {
    logServerError("readiness_check_failed", { route: "/api/readiness", status: 503 });
    return withRequestId(NextResponse.json({ status: "unavailable", service: "avg-connects", timestamp: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store" } }), requestId);
  }
  return withRequestId(NextResponse.json({ status: "ready", service: "avg-connects", uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString(), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "unknown" }, { headers: { "Cache-Control": "no-store" } }), requestId);
}
