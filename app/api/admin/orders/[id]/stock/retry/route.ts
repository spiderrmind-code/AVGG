import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { applyPaidOrderStock } from "@/lib/mercadopago-orders";
import { getDb } from "@/lib/mongo";
import { requestIdFrom } from "@/lib/request-id";

type AuditedOrder = { operationalEvents?: Array<{ key: string; type: string; timestamp: Date; actor: string; source: string; result: string }> };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 403 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ success: false, error: "INVALID_ORDER_ID" }, { status: 400 });
  const result = await applyPaidOrderStock(id);
  const requestId = requestIdFrom(request);
  const outcome = result.success ? result.outcome : result.outcome;
  const eventKey = `stock_retry:${requestId}`;
  await (await getDb()).collection<AuditedOrder>("orders").updateOne(
    { _id: new ObjectId(id), "operationalEvents.key": { $ne: eventKey } },
    { $push: { operationalEvents: { key: eventKey, type: "order.stock_retry", timestamp: new Date(), actor: session.user.email.replace(/^(.).*(@.*)$/, "$1***$2"), source: "admin", result: outcome } } },
  );
  return NextResponse.json({ success: result.success, result }, { status: result.success ? 200 : result.outcome === "processing_conflict" ? 409 : 422 });
}
