import { NextResponse } from "next/server";
import { checkReadiness } from "@/lib/health";
import { logServerError } from "@/lib/logger";
import { getDb } from "@/lib/mongo";
import { getStudioDb } from "@/lib/studio-mongo";
import { resolveStudioDeployment } from "@/lib/studio-routes";
import { requestIdFrom, withRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = requestIdFrom(request);
  const deployment = resolveStudioDeployment();
  const service = deployment.enabled ? "13-studio-tattoo" : "avg-connects";
  const result = deployment.enabled && !deployment.consistent
    ? { ready: false as const }
    : await checkReadiness(async () => {
      const db = deployment.enabled ? await getStudioDb() : await getDb();
      await db.command({ ping: 1 });
    });
  if (!result.ready) {
    logServerError("readiness_check_failed", { route: "/api/readiness", status: 503 });
    return withRequestId(NextResponse.json({ status: "unavailable", service, timestamp: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store" } }), requestId);
  }
  return withRequestId(NextResponse.json({ status: "ready", service, uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString(), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "unknown" }, { headers: { "Cache-Control": "no-store" } }), requestId);
}
