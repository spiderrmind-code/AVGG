import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  const params = new URL(request.url).searchParams; const status = params.get("status"); const rawPage = Number(params.get("page")); const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1; const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
  const filter = status && /^[a-z_]{1,40}$/i.test(status) ? { paymentStatus: status } : {};
  try {
    const db = await getDb();
    const [orders, total] = await Promise.all([db.collection("orders").find(filter, { projection: { orderNumber: 1, paymentId: 1, paymentStatus: 1, statusDetail: 1, total: 1, currency: 1, paymentMethod: 1, paidAt: 1, createdAt: 1 } }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(), db.collection("orders").countDocuments(filter)]);
    return NextResponse.json({ payments: orders.map((order) => ({ orderId: String(order._id), orderNumber: order.orderNumber, paymentId: typeof order.paymentId === "string" ? `${order.paymentId.slice(0, 4)}…` : "Sin información", status: order.paymentStatus, statusDetail: order.statusDetail ?? "Sin información", amount: order.total ?? 0, currency: order.currency ?? "ARS", method: order.paymentMethod ?? "Sin información", date: order.paidAt ?? order.createdAt ?? null })), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch { return NextResponse.json({ error: "PAYMENTS_UNAVAILABLE" }, { status: 500 }); }
}
