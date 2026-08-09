import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";
import type { Document, Filter } from "mongodb";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const params = new URL(request.url).searchParams;
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10_000) : 1;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 25, 1), 100);
  const filter: Filter<Document> = {};
  const status = params.get("status");
  if (status && /^[a-z_]{1,40}$/i.test(status)) filter.status = status;
  try {
    const db = await getDb();
    const projection = { orderNumber: 1, customer: 1, status: 1, paymentStatus: 1, fulfillmentStatus: 1, total: 1, currency: 1, tracking: 1, trackingUrl: 1, stockIssue: 1, stockIssueReason: 1, operationalEvents: 1, createdAt: 1, updatedAt: 1 };
    const [orders, total] = await Promise.all([
      db.collection("orders").find(filter, { projection }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("orders").countDocuments(filter),
    ]);
    return NextResponse.json({ success: true, orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
  } catch {
    return NextResponse.json({ success: false, message: "Error cargando operaciones" }, { status: 500 });
  }
}
