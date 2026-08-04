import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

async function admin() { return getServerSession(authOptions); }
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await admin();
  if (!session?.user?.email) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  const { id } = await params; if (!ObjectId.isValid(id)) return NextResponse.json({ error: "INVALID_ORDER_ID" }, { status: 400 });
  const order = await (await getDb()).collection("orders").findOne({ _id: new ObjectId(id) }); if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
  const fields = ["paymentStatus", "fulfillmentStatus", "cjValidationStatus", "cjValidatedAt", "cjStockSnapshot", "cjShippingSnapshot", "cjMarginSnapshot", "supplierOrderId", "cjOrderId", "cjOrderNumber", "cjPlatformOrderId", "cjShipmentOrderId", "trackingNumber", "trackingStatus", "trackingCarrier", "trackingUrl", "cjLastSyncAt", "cjLastError"] as const;
  const result: Record<string, unknown> = { orderId: id, creationEnabled: process.env.CJ_ORDER_CREATION_ENABLED === "true" };
  for (const field of fields) if (order[field] !== undefined) result[field] = order[field];
  return NextResponse.json(result);
}
