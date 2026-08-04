import { NextResponse } from "next/server";
import { requestIdFrom, withRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = requestIdFrom(request);
  return withRequestId(NextResponse.json({ status: "ok", service: "avg-connects", uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString(), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "unknown" }, { headers: { "Cache-Control": "no-store" } }), requestId);
}
