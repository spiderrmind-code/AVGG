import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { syncDropsheableCatalog } from "@/lib/dropsheable/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncLock = Promise<unknown> | null | undefined;

declare global {
  var __dropsheableSyncLock: SyncLock;
}

function getExpectedCronSecret() {
  return process.env.VERCEL_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
}

function isAuthorized(request: Request) {
  const expected = getExpectedCronSecret();
  if (!expected) return false;

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim() === expected;
  }

  const cronHeader = request.headers.get("x-vercel-cron") || "";
  const customSecretHeader = request.headers.get("x-cron-secret") || "";
  return cronHeader === "1" && customSecretHeader === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const currentLock = globalThis.__dropsheableSyncLock;
  if (currentLock) {
    return NextResponse.json({ ok: false, error: "sync_in_progress" }, { status: 409 });
  }

  const syncRun = (async () => {
    const db = await getDb();
    const summary = await syncDropsheableCatalog(db.collection("products"));
    return {
      ok: true,
      source: "dropsheable-sync",
      productsFound: summary.productsFound,
      productsNew: summary.productsNew,
      productsExisting: summary.productsExisting,
      productsWithoutCategory: summary.productsWithoutCategory,
      productsWithoutStock: summary.productsWithoutStock,
      errors: summary.errors,
      processed: summary.processed,
      dryRun: false,
    };
  })();

  globalThis.__dropsheableSyncLock = syncRun;

  try {
    const result = await syncRun;
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Dropsheable sync cron failed");
    return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
  } finally {
    globalThis.__dropsheableSyncLock = undefined;
  }
}

export async function POST(request: Request) {
  return GET(request);
}
