import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { processPendingFulfillment } from "@/lib/fulfillment/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  try {
    const db = await getDb();
    const result = await processPendingFulfillment(db.collection("orders"));
    return NextResponse.json({ ok: true, source: "fulfillment-worker", ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "fulfillment_worker_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
