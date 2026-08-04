import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import { checkRateLimit, requestIdentifier } from "@/lib/request-rate-limit";
import { hasTrustedOrigin } from "@/lib/request-security";
import { executeCjFulfillment, reconcileCjFulfillment, syncCjFulfillment, validateCjFulfillment } from "@/lib/cj/fulfillment-service";
import { CjFeatureDisabledError } from "@/lib/cj/client";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await getServerSession(authOptions); if (!session?.user?.email) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 }); if (session.user.role !== "admin") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 }); const rate = checkRateLimit(`cj-admin:${requestIdentifier(request)}`, 10, 600_000); if (!rate.allowed) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const { id, action } = await params; if (!ObjectId.isValid(id)) return NextResponse.json({ error: "INVALID_ORDER_ID" }, { status: 400 }); const db = await getDb(); const order = await db.collection("orders").findOne({ _id: new ObjectId(id) }); if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  try {
    if (action === "validate") { const result = await validateCjFulfillment(id); return NextResponse.json(result, { status: result.eligible ? 200 : 422 }); }
    if (action === "create") { if (process.env.CJ_ORDER_CREATION_ENABLED !== "true") return NextResponse.json({ error: "CJ_ORDER_CREATION_DISABLED" }, { status: 503 }); return NextResponse.json(await executeCjFulfillment(id)); }
    if (action === "sync") { if (!order.cjPlatformOrderId && !order.supplierOrderId) return NextResponse.json({ error: "CJ_ORDER_IDENTIFIERS_MISSING" }, { status: 409 }); return NextResponse.json(await syncCjFulfillment(id)); }
    if (action === "reconcile") { if (order.fulfillmentStatus !== "unknown") return NextResponse.json({ error: "CJ_RECONCILIATION_NOT_ALLOWED" }, { status: 409 }); return NextResponse.json(await reconcileCjFulfillment(id)); }
    return NextResponse.json({ error: "INVALID_CJ_ACTION" }, { status: 400 });
  } catch (error) { if (error instanceof CjFeatureDisabledError) return NextResponse.json({ error: "CJ_ORDER_CREATION_DISABLED" }, { status: 503 }); return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }); }
}
