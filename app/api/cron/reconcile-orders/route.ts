import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { reconcileFulfillmentOrders } from "@/lib/fulfillment/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  try {
    const db = await getDb();
    const result = await reconcileFulfillmentOrders(db.collection("orders"));
    return NextResponse.json({ ok: true, source: "order-reconciliation", ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "reconciliation_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
