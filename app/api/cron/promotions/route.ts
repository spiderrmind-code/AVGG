import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { maintainAutomaticPromotions } from "@/lib/promotions-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  try {
    const db = await getDb();
    const result = await maintainAutomaticPromotions(db.collection("products"), db.collection("promotions"));
    return NextResponse.json({ ok: true, source: "automatic-promotions", ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Automatic promotions cron failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ ok: false, error: "automatic_promotions_failed" }, { status: 500 });
  }
}

export async function POST(request: Request) { return GET(request); }